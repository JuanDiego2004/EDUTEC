import {
    EstadoSistema,
    TipoBaseDatos,
    ConfiguracionConexion,
    OperacionPendiente,
    EventoFailover,
    ResultadoSalud
} from './tipos';
import {
    obtenerClienteMongoPrimario,
    obtenerClienteMongoSecundario,
    verificarSaludMongoPrimario
} from './conexionMongo';
import {
    obtenerPoolPostgresPrimario,
    obtenerPoolPostgresSecundario,
    verificarSaludPostgresPrimario
} from './conexionPostgres';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gestor centralizado de conexiones con failover automático
 * Patrón Singleton para mantener estado global
 */
class GestorConexionesBD {
    private static instancia: GestorConexionesBD;
    private estadoSistema: EstadoSistema;
    private intervalosVerificacion: Map<TipoBaseDatos, NodeJS.Timeout> = new Map();

    private constructor() {
        this.estadoSistema = {
            postgres: this.crearConfiguracionInicial(),
            mongodb: this.crearConfiguracionInicial(),
            inicializadoEn: new Date(),
            modoMantenimiento: false
        };

        if (this.modoDebug()) {
            console.log(' Gestor de Conexiones BD inicializado');
        }
    }

    /**
     * Obtiene la instancia única del gestor (Singleton)
     */
    public static obtenerInstancia(): GestorConexionesBD {
        if (!GestorConexionesBD.instancia) {
            GestorConexionesBD.instancia = new GestorConexionesBD();
        }
        return GestorConexionesBD.instancia;
    }

    /**
     * Ejecuta una operación con failover automático
     * Esta es la función principal que usarán todos los servicios
     */
    public async ejecutarConFailover<T>(
        tipoBase: TipoBaseDatos,
        operacion: (cliente: any) => Promise<T>,
        esEscritura: boolean = false,
        metadataOperacion?: Partial<OperacionPendiente>
    ): Promise<T> {
        const config = this.estadoSistema[tipoBase];

        // Verificar si estamos en modo mantenimiento
        if (this.estadoSistema.modoMantenimiento) {
            throw new Error('Sistema en modo mantenimiento');
        }

        // 1. Intentar con base primaria si está activa
        if (config.estado === 'ACTIVA' && !config.usandoSecundaria) {
            try {
                const clientePrimaria = await this.obtenerClientePrimaria(tipoBase);
                const inicioTiempo = Date.now();
                const resultado = await operacion(clientePrimaria);
                const tiempoRespuesta = Date.now() - inicioTiempo;

                if (this.modoDebug()) {
                    console.log(` ${tipoBase} primaria respondió en ${tiempoRespuesta}ms`);
                }

                // Resetear errores consecutivos en caso de éxito
                config.erroresConsecutivos = 0;
                return resultado;

            } catch (error) {
                console.error(`Fallo en ${tipoBase} primaria:`, (error as Error).message);
                await this.manejarFalloPrimaria(tipoBase, error as Error);
            }
        }

        // 2. Usar secundaria (ya sea porque primaria falló o ya estaba en modo failover)
        if (config.usandoSecundaria) {
            try {
                const clienteSecundaria = await this.obtenerClienteSecundaria(tipoBase);
                const resultado = await operacion(clienteSecundaria);

                // Si es operación de escritura, guardar en cola de sincronización
                if (esEscritura && metadataOperacion) {
                    this.agregarOperacionPendiente(tipoBase, {
                        id: uuidv4(),
                        tipo: metadataOperacion.tipo!,
                        tabla: metadataOperacion.tabla || '',
                        coleccion: metadataOperacion.coleccion,
                        datos: metadataOperacion.datos,
                        datosAnteriores: metadataOperacion.datosAnteriores,
                        fechaCreacion: new Date(),
                        intentosRealizados: 0
                    });

                    if (this.modoDebug()) {
                        console.log(`Operación de escritura guardada en cola (${config.colaPendientes.length} pendientes)`);
                    }
                }

                return resultado;

            } catch (errorSecundaria) {
                console.error(`🚨 CRÍTICO: Ambas bases ${tipoBase} han fallado`);
                this.registrarEventoFailover({
                    tipo: 'FALLO_TOTAL',
                    baseDatos: tipoBase,
                    timestamp: new Date(),
                    detalles: `Primaria y secundaria caídas: ${(errorSecundaria as Error).message}`
                });
                throw new Error(`Sistema temporalmente no disponible (${tipoBase})`);
            }
        }

        throw new Error(`Estado inconsistente en ${tipoBase}`);
    }

    /**
     * Maneja el fallo de la base primaria
     */
    private async manejarFalloPrimaria(tipoBase: TipoBaseDatos, error: Error): Promise<void> {
        const config = this.estadoSistema[tipoBase];

        config.erroresConsecutivos++;
        config.ultimoIntento = new Date();

        // Cambiar a modo failover después de 2 fallos consecutivos
        if (config.erroresConsecutivos >= 2) {
            console.log(`ACTIVANDO FAILOVER para ${tipoBase}...`);
            config.estado = 'CAIDA';
            config.usandoSecundaria = true;

            this.registrarEventoFailover({
                tipo: 'CAMBIO_A_SECUNDARIA',
                baseDatos: tipoBase,
                timestamp: new Date(),
                detalles: `Primaria caída después de ${config.erroresConsecutivos} intentos: ${error.message}`
            });

            // Iniciar verificación de recuperación en segundo plano
            this.iniciarVerificacionRecuperacion(tipoBase);
        }
    }

    /**
     * Inicia un proceso de verificación periódica para detectar recuperación
     */
    private iniciarVerificacionRecuperacion(tipoBase: TipoBaseDatos): void {
        // Evitar múltiples intervalos para la misma base
        if (this.intervalosVerificacion.has(tipoBase)) {
            return;
        }

        const intervalo = parseInt(process.env.INTERVALO_VERIFICACION_RECUPERACION || '10000');

        const intervalId = setInterval(async () => {
            if (this.modoDebug()) {
                console.log(` Verificando salud de ${tipoBase} primaria...`);
            }

            try {
                const resultado = await this.verificarSaludPrimaria(tipoBase);

                if (resultado.estaActiva) {
                    console.log(` ${tipoBase} primaria recuperada! Iniciando sincronización...`);

                    // Detener el chequeo
                    clearInterval(intervalId);
                    this.intervalosVerificacion.delete(tipoBase);

                    // Iniciar sincronización
                    await this.sincronizarDatosPendientes(tipoBase);
                }

            } catch (error) {
                if (this.modoDebug()) {
                    console.log(`⏳ ${tipoBase} primaria aún no disponible. Reintentando...`);
                }
            }
        }, intervalo);

        this.intervalosVerificacion.set(tipoBase, intervalId);
    }

    /**
     * Sincroniza los datos pendientes de la secundaria a la primaria
     */
    private async sincronizarDatosPendientes(tipoBase: TipoBaseDatos): Promise<void> {
        const config = this.estadoSistema[tipoBase];

        // Cambiar estado a SINCRONIZANDO
        config.estado = 'SINCRONIZANDO';

        const totalOperaciones = config.colaPendientes.length;
        console.log(`Sincronizando ${totalOperaciones} operaciones pendientes en ${tipoBase}...`);

        let operacionesExitosas = 0;
        let operacionesFallidas = 0;

        for (const operacion of config.colaPendientes) {
            try {
                await this.replicarOperacionEnPrimaria(tipoBase, operacion);
                operacionesExitosas++;
            } catch (error) {
                operacionesFallidas++;
                operacion.error = (error as Error).message;
                operacion.intentosRealizados++;

                console.error(`Error sincronizando operación ${operacion.id}:`, error);
            }
        }

        // Limpiar operaciones exitosas de la cola
        config.colaPendientes = config.colaPendientes.filter(op => op.error);

        // Restaurar estado normal
        config.usandoSecundaria = false;
        config.estado = 'ACTIVA';
        config.erroresConsecutivos = 0;
        config.ultimaRecuperacion = new Date();

        console.log(
            ` Sincronización completada: ${operacionesExitosas} exitosas, ${operacionesFallidas} fallidas`
        );

        this.registrarEventoFailover({
            tipo: 'SINCRONIZACION_COMPLETADA',
            baseDatos: tipoBase,
            timestamp: new Date(),
            detalles: `${operacionesExitosas}/${totalOperaciones} operaciones sincronizadas`,
            operacionesPendientes: config.colaPendientes.length
        });
    }

    /**
     * Replica una operación pendiente en la base primaria
     */
    private async replicarOperacionEnPrimaria(
        tipoBase: TipoBaseDatos,
        operacion: OperacionPendiente
    ): Promise<void> {
        if (tipoBase === 'postgres') {
            const pool = await obtenerPoolPostgresPrimario();

            switch (operacion.tipo) {
                case 'INSERT':
                    // Lógica de INSERT
                    break;
                case 'UPDATE':
                    // Lógica de UPDATE
                    break;
                case 'DELETE':
                    // Lógica de DELETE
                    break;
            }
        } else if (tipoBase === 'mongodb') {
            const db = await obtenerClienteMongoPrimario();
            const coleccion = db.collection(operacion.coleccion || operacion.tabla);

            switch (operacion.tipo) {
                case 'INSERT':
                    await coleccion.insertOne(operacion.datos);
                    break;
                case 'UPDATE':
                    await coleccion.updateOne(
                        { _id: operacion.datos._id },
                        { $set: operacion.datos }
                    );
                    break;
                case 'DELETE':
                    await coleccion.deleteOne({ _id: operacion.datos._id });
                    break;
            }
        }
    }

    /**
     * Verifica la salud de la base primaria
     */
    private async verificarSaludPrimaria(tipoBase: TipoBaseDatos): Promise<ResultadoSalud> {
        const inicio = Date.now();

        try {
            let estaActiva = false;

            if (tipoBase === 'postgres') {
                estaActiva = await verificarSaludPostgresPrimario();
            } else if (tipoBase === 'mongodb') {
                estaActiva = await verificarSaludMongoPrimario();
            }

            return {
                estaActiva,
                tiempoRespuesta: Date.now() - inicio,
                mensaje: estaActiva ? 'Base de datos respondiendo' : 'Base de datos no responde',
                timestamp: new Date()
            };
        } catch (error) {
            return {
                estaActiva: false,
                tiempoRespuesta: Date.now() - inicio,
                mensaje: (error as Error).message,
                timestamp: new Date()
            };
        }
    }

    // Métodos auxiliares

    private async obtenerClientePrimaria(tipoBase: TipoBaseDatos): Promise<any> {
        if (tipoBase === 'postgres') {
            return obtenerPoolPostgresPrimario();
        } else {
            return obtenerClienteMongoPrimario();
        }
    }

    private async obtenerClienteSecundaria(tipoBase: TipoBaseDatos): Promise<any> {
        if (tipoBase === 'postgres') {
            return obtenerPoolPostgresSecundario();
        } else {
            return obtenerClienteMongoSecundario();
        }
    }

    private agregarOperacionPendiente(tipoBase: TipoBaseDatos, operacion: OperacionPendiente): void {
        this.estadoSistema[tipoBase].colaPendientes.push(operacion);
    }

    private registrarEventoFailover(evento: EventoFailover): void {
        // Aquí puedes guardar en un sistema de logging o base de datos
        console.log(' Evento Failover:', evento);
    }

    private crearConfiguracionInicial(): ConfiguracionConexion {
        return {
            estado: 'ACTIVA',
            usandoSecundaria: false,
            ultimoIntento: null,
            colaPendientes: [],
            erroresConsecutivos: 0,
            ultimaRecuperacion: null
        };
    }

    private modoDebug(): boolean {
        return process.env.DB_FAILOVER_DEBUG === 'true';
    }

    /**
     * Métodos públicos de utilidad
     */

    public obtenerEstadoSistema(): EstadoSistema {
        return { ...this.estadoSistema };
    }

    public activarModoMantenimiento(): void {
        this.estadoSistema.modoMantenimiento = true;
        console.log(' Modo mantenimiento activado');
    }

    public desactivarModoMantenimiento(): void {
        this.estadoSistema.modoMantenimiento = false;
        console.log(' Modo mantenimiento desactivado');
    }
}

// Exportar instancia única
export const gestorDB = GestorConexionesBD.obtenerInstancia();
