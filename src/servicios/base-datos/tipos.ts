/**
 * Tipos de datos para el sistema de failover de bases de datos
 */

export type EstadoBaseDatos = 'ACTIVA' | 'CAIDA' | 'SINCRONIZANDO' | 'RECUPERANDO';

export type TipoBaseDatos = 'postgres' | 'mongodb';

export type TipoOperacion = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';

/**
 * Configuración de conexión para cada base de datos
 */
export interface ConfiguracionConexion {
    estado: EstadoBaseDatos;
    usandoSecundaria: boolean;
    ultimoIntento: Date | null;
    colaPendientes: OperacionPendiente[];
    erroresConsecutivos: number;
    ultimaRecuperacion: Date | null;
}

/**
 * Operación pendiente de sincronización
 */
export interface OperacionPendiente {
    id: string;
    tipo: TipoOperacion;
    tabla: string;
    coleccion?: string; // Para MongoDB
    datos: any;
    datosAnteriores?: any; // Para UPDATE, guardar el "antes"
    fechaCreacion: Date;
    intentosRealizados: number;
    error?: string;
}

/**
 * Estado global del sistema de bases de datos
 */
export interface EstadoSistema {
    postgres: ConfiguracionConexion;
    mongodb: ConfiguracionConexion;
    inicializadoEn: Date;
    modoMantenimiento: boolean;
}

/**
 * Configuración de timeout y reintentos
 */
export interface ConfiguracionFailover {
    timeoutConexion: number;
    intervaloVerificacion: number;
    maxReintentos: number;
    modoDebug: boolean;
}

/**
 * Resultado de verificación de salud
 */
export interface ResultadoSalud {
    estaActiva: boolean;
    tiempoRespuesta: number;
    mensaje: string;
    timestamp: Date;
}

/**
 * Evento de failover para logging
 */
export interface EventoFailover {
    tipo: 'CAMBIO_A_SECUNDARIA' | 'RECUPERACION_PRIMARIA' | 'FALLO_TOTAL' | 'SINCRONIZACION_COMPLETADA';
    baseDatos: TipoBaseDatos;
    timestamp: Date;
    detalles: string;
    operacionesPendientes?: number;
}
