// services/activityLogger.ts

export type ActivityModule =
  | 'profesores'
  | 'estudiantes'
  | 'usuarios'
  | 'cursos'
  | 'matriculas'
  | 'pagos'
  | 'grados'
  | 'salones'
  | 'ciclos'
  | 'auth';

export type ActivityType =
  | 'crear'
  | 'actualizar'
  | 'eliminar'
  | 'ver'
  | 'inicio_sesion'
  | 'cierre_sesion'
  | 'inicio_sesion_fallido'
  | 'registro'
  | 'registro_fallido';

interface LogMetadata {
  [key: string]: any;
}

interface ModuleLogParams {
  idUsuario: string;
  correoUsuario: string;
  rolUsuario: string;
  tipoActividad: ActivityType;
  modulo: ActivityModule;
  descripcion: string;
  exito: boolean;
  metadata?: LogMetadata;
  idEntidad?: string;
  tipoEntidad?: string;
  datosPrevios?: any;
  datosNuevos?: any;
}

export const activityLogger = {
  /**
   * Log genérico para cualquier módulo
   * Los logs se guardan en la colección centralizada 'logs' en la BD 'reyna_de_la_paz'
   */
  async log(params: ModuleLogParams) {
    try {
      const logData = {
        idUsuario: params.idUsuario,
        correoUsuario: params.correoUsuario,
        rolUsuario: params.rolUsuario,
        tipoActividad: params.tipoActividad,
        modulo: params.modulo,
        descripcion: params.descripcion,
        exito: params.exito,
        metadata: params.metadata || {},
        idEntidad: params.idEntidad,
        tipoEntidad: params.tipoEntidad,
        datosPrevios: params.datosPrevios,
        datosNuevos: params.datosNuevos,
        fechaHora: new Date().toISOString(),
      };

      const response = await fetch('/api/module-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });

      if (!response.ok) {
        console.error('Error al registrar log:', await response.text());
      }

      return await response.json();
    } catch (error) {
      console.error('Error en activityLogger.log:', error);
      return null;
    }
  },

  /**
   * Log de creación de entidad
   */
  async logCreate(
    userId: string,
    userEmail: string,
    userRole: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    data: any
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'crear',
      modulo: module,
      descripcion: `Creó ${entityType} con ID: ${entityId}`,
      exito: true,
      idEntidad: entityId,
      tipoEntidad: entityType,
      datosNuevos: data,
    });
  },

  /**
   * Log de actualización de entidad
   */
  async logUpdate(
    userId: string,
    userEmail: string,
    userRole: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    previousData: any,
    newData: any
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'actualizar',
      modulo: module,
      descripcion: `Actualizó ${entityType} con ID: ${entityId}`,
      exito: true,
      idEntidad: entityId,
      tipoEntidad: entityType,
      datosPrevios: previousData,
      datosNuevos: newData,
    });
  },

  /**
   * Log de eliminación de entidad
   */
  async logDelete(
    userId: string,
    userEmail: string,
    userRole: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    deletedData: any
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'eliminar',
      modulo: module,
      descripcion: `Eliminó ${entityType} con ID: ${entityId}`,
      exito: true,
      idEntidad: entityId,
      tipoEntidad: entityType,
      datosPrevios: deletedData,
    });
  },

  /**
   * Log de visualización
   */
  async logView(
    userId: string,
    userEmail: string,
    userRole: string,
    module: ActivityModule,
    description: string,
    filters?: any
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'ver',
      modulo: module,
      descripcion: description,
      exito: true,
      metadata: { filters },
    });
  },

  /**
   * Log de inicio de sesión exitoso
   */
  async logLogin(userId: string, email: string, role: string) {
    return this.log({
      idUsuario: userId,
      correoUsuario: email,
      rolUsuario: role,
      tipoActividad: 'inicio_sesion',
      modulo: 'auth',
      descripcion: `Inicio de sesión exitoso`,
      exito: true,
    });
  },

  /**
   * Log de cierre de sesión
   */
  async logLogout(userId: string, email: string, role: string) {
    return this.log({
      idUsuario: userId,
      correoUsuario: email,
      rolUsuario: role,
      tipoActividad: 'cierre_sesion',
      modulo: 'auth',
      descripcion: `Cierre de sesión`,
      exito: true,
    });
  },

  /**
   * Log de pago
   */
  async logPayment(
    userId: string,
    userEmail: string,
    userRole: string,
    studentId: string,
    amount: number,
    paymentMethod: string,
    concept: string
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'crear', // Asumimos crear pago
      modulo: 'pagos',
      descripcion: `Pago de $${amount} por ${concept} (${paymentMethod})`,
      exito: true,
      idEntidad: studentId,
      tipoEntidad: 'estudiante', // O 'pago' si tuviéramos ID de pago
      datosNuevos: { amount, paymentMethod, concept },
    });
  },

  /**
   * Log de inicio de sesión fallido
   */
  async logFailedLogin(email: string, errorMessage: string) {
    return this.log({
      idUsuario: 'N/A',
      correoUsuario: email,
      rolUsuario: 'desconocido',
      tipoActividad: 'inicio_sesion_fallido',
      modulo: 'auth',
      descripcion: `Intento de inicio de sesión fallido: ${errorMessage}`,
      exito: false,
      metadata: { error: errorMessage },
    });
  },

  /**
   * Log de error genérico
   */
  async logError(
    userId: string,
    userEmail: string,
    userRole: string,
    module: ActivityModule,
    errorMessage: string,
    errorStack?: string
  ) {
    return this.log({
      idUsuario: userId,
      correoUsuario: userEmail,
      rolUsuario: userRole,
      tipoActividad: 'ver', // Usamos 'ver' como tipo genérico para errores si no hay uno específico
      modulo: module,
      descripcion: `Error: ${errorMessage}`,
      exito: false,
      metadata: { error: errorMessage, stack: errorStack },
    });
  },
};