/**
 * Hook personalizado para registrar actividades
 * 
 * Facilita el uso del activity logger en componentes React
 */

import { useCallback } from 'react';

import { useAuth } from '@/funcionalidades/autenticacion/ganchos/useAuth';
import { activityLogger, ActivityModule, ActivityType } from '@/servicios/logger/registroActividad';


export function useActivityLogger() {
  const { user, role } = useAuth();

  /**
   * Registra una actividad genérica
   */
  const logActivity = useCallback(
    async (
      activityType: ActivityType,
      module: ActivityModule,
      description: string,
      metadata?: any
    ) => {
      if (!user?.id) {
        console.warn('No se puede registrar actividad: usuario no autenticado');
        return null;
      }

      return activityLogger.log({
        idUsuario: user.id,
        correoUsuario: user.email || 'sin-email',
        rolUsuario: role || 'desconocido',
        tipoActividad: activityType,
        modulo: module,
        descripcion: description,
        exito: true,
        metadata,
      });
    },
    [user]
  );

  /**
   * Registra creación de entidad
   */
  const logCreate = useCallback(
    async (
      module: ActivityModule,
      entityType: string,
      entityId: string,
      data: any
    ) => {
      if (!user?.id) return null;

      return activityLogger.logCreate(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        module,
        entityType,
        entityId,
        data
      );
    },
    [user]
  );

  /**
   * Registra actualización de entidad
   */
  const logUpdate = useCallback(
    async (
      module: ActivityModule,
      entityType: string,
      entityId: string,
      previousData: any,
      newData: any
    ) => {
      if (!user?.id) return null;

      return activityLogger.logUpdate(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        module,
        entityType,
        entityId,
        previousData,
        newData
      );
    },
    [user]
  );

  /**
   * Registra eliminación de entidad
   */
  const logDelete = useCallback(
    async (
      module: ActivityModule,
      entityType: string,
      entityId: string,
      deletedData: any
    ) => {
      if (!user?.id) return null;

      return activityLogger.logDelete(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        module,
        entityType,
        entityId,
        deletedData
      );
    },
    [user]
  );

  /**
   * Registra visualización de datos
   */
  const logView = useCallback(
    async (
      module: ActivityModule,
      description: string,
      filters?: any
    ) => {
      if (!user?.id) return null;

      return activityLogger.logView(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        module,
        description,
        filters
      );
    },
    [user]
  );

  /**
   * Registra procesamiento de pago
   */
  const logPayment = useCallback(
    async (
      estudianteId: string,
      monto: number,
      metodoPago: string,
      concepto: string
    ) => {
      if (!user?.id) return null;

      return activityLogger.logPayment(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        estudianteId,
        monto,
        metodoPago,
        concepto
      );
    },
    [user]
  );

  /**
   * Registra error
   */
  const logError = useCallback(
    async (
      module: ActivityModule,
      errorMessage: string,
      errorStack?: string
    ) => {
      if (!user?.id) return null;

      return activityLogger.logError(
        user.id,
        user.email || 'sin-email',
        role || 'desconocido',
        module,
        errorMessage,
        errorStack
      );
    },
    [user]
  );

  return {
    logActivity,
    logCreate,
    logUpdate,
    logDelete,
    logView,
    logPayment,
    logError,
  };
}
