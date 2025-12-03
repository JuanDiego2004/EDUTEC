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

    public static obtenerInstancia(): GestorConexionesBD {
        if (!GestorConexionesBD.instancia) {
            GestorConexionesBD.instancia = new GestorConexionesBD();
        }
        return GestorConexionesBD.instancia;
    }


    public async ejecutarConFailover<T>(
        tipoBase: TipoBaseDatos,
        operacion: (cliente: any) => Promise<T>,
        esEscritura: boolean = false,
        metadataOperacion?: Partial<OperacionPendiente>
    ): Promise<T> {
        const config = this.estadoSistema[tipoBase];

        
        if (this.estadoSistema.modoMantenimiento) {
            throw new Error('Sistema en modo mantenimiento');
        }

        
        if (config.estado === 'ACTIVA' && !config.usandoSecundaria) {
            try {
                const clientePrimaria = await this.obtenerClientePrimaria(tipoBase);
                const inicioTiempo = Date.now();
                const resultado = await operacion(clientePrimaria);
                const tiempoRespuesta = Date.now() - inicioTiempo;

                if (this.modoDebug()) {
                    console.log(` ${tipoBase} primaria respondió en ${tiempoRespuesta}ms`);
                }

                
                config.erroresConsecutivos = 0;
                return resultado;

            } catch (error) {
                console.error(`Fallo en ${tipoBase} primaria:`, (error as Error).message);
                await this.manejarFalloPrimaria(tipoBase, error as Error);
            }
        }

        
        if (config.usandoSecundaria) {
            try {
                const clienteSecundaria = await this.obtenerClienteSecundaria(tipoBase);
                const resultado = await operacion(clienteSecundaria);

                
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
                console.error(`CRÍTICO: Ambas bases ${tipoBase} han fallado`);
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

            
            this.iniciarVerificacionRecuperacion(tipoBase);
        }
    }

    /**
     * Inicia un proceso de verificación periódica para detectar recuperación
     */
    private iniciarVerificacionRecuperacion(tipoBase: TipoBaseDatos): void {
        
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

                    
                    clearInterval(intervalId);
                    this.intervalosVerificacion.delete(tipoBase);

                    
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

        
        config.colaPendientes = config.colaPendientes.filter(op => op.error);

        
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
                    
                    break;
                case 'UPDATE':
                    
                    break;
                case 'DELETE':
                    
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


export const gestorDB = GestorConexionesBD.obtenerInstancia();
