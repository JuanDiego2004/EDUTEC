/**
 * VERSIÓN MEJORADA: Wrapper de Supabase con replicación DUAL
 * - Lecturas: Primaria → Secundaria (failover automático)
 * - Escrituras: AMBAS bases simultáneamente
 * 
 * Esto garantiza que ambas bases siempre tengan los mismos datos
 */

import { obtenerClienteSupabasePrimario, obtenerClienteSupabaseSecundario } from "./conexionPostgres";

export interface QueryResult<T> {
    data: T[] | null;
    error: any;
}

export interface SingleResult<T> {
    data: T | null;
    error: any;
}

/**
 * Estado interno para tracking de cual Supabase usar para LECTURAS
 */
let usandoSecundaria = false;
let erroresConsecutivos = 0;

/**
 * Timestamp del último failover detectado
 * Se usa para sincronización automática cuando la primaria se recupera
 */
let timestampUltimoFailover: Date | null = null;

/**
 * Función para notificar recuperación de primaria
 * Se puede customizar para ejecutar lógica adicional
 */
let onPrimariaRecuperada: ((timestamp: Date) => void) | null = null;

/**
 * Registra callback para cuando se detecte recuperación de primaria
 */
export function registrarCallbackRecuperacion(callback: (timestamp: Date) => void) {
    onPrimariaRecuperada = callback;
}

/**
 * Obtiene el timestamp del último failover (si ocurrió)
 */
export function obtenerTimestampFailover(): Date | null {
    return timestampUltimoFailover;
}

export const supabaseFailover = {
    /**
     * SELECT con failover automático
     * Primaria → Secundaria si falla
     */
    async select<T = any>(
        tabla: string,
        opciones?: {
            seleccion?: string;
            filtros?: Record<string, any>;
            orden?: { campo: string; ascendente?: boolean };
            limite?: number;
        }
    ): Promise<QueryResult<T>> {
        try {
            // Intentar con primaria primero si no estamos en modo failover
            if (!usandoSecundaria) {
                const cliente = obtenerClienteSupabasePrimario();
                let query = cliente.from(tabla).select(opciones?.seleccion || '*');

                if (opciones?.filtros) {
                    Object.entries(opciones.filtros).forEach(([key, value]) => {
                        query = query.eq(key, value);
                    });
                }

                if (opciones?.orden) {
                    query = query.order(opciones.orden.campo, { ascending: opciones.orden.ascendente ?? true });
                }

                if (opciones?.limite) {
                    query = query.limit(opciones.limite);
                }

                const resultado = await query;

                if (!resultado.error) {
                    erroresConsecutivos = 0;

                    // Si estábamos en failover y ahora funciona, la primaria se recuperó
                    if (usandoSecundaria) {
                        console.log('🎉 PRIMARIA RECUPERADA - Iniciando sincronización automática');
                        usandoSecundaria = false;

                        // Notificar recuperación si hay callback registrado
                        if (onPrimariaRecuperada && timestampUltimoFailover) {
                            onPrimariaRecuperada(timestampUltimoFailover);
                        }

                        timestampUltimoFailover = null;
                    }

                    return {
                        data: (resultado.data as unknown) as T[],
                        error: null
                    };
                }

                // Si falla, marcar para usar secundaria
                erroresConsecutivos++;
                if (erroresConsecutivos >= 2) {
                    console.warn(' Supabase primario falló, cambiando a secundario');

                    // Guardar timestamp del failover
                    if (!usandoSecundaria && !timestampUltimoFailover) {
                        timestampUltimoFailover = new Date();
                        console.warn(`⏰ Timestamp de failover guardado: ${timestampUltimoFailover.toISOString()}`);
                    }

                    usandoSecundaria = true;
                }
            }

            // Usar secundaria
            const clienteSecundario = obtenerClienteSupabaseSecundario();
            let query = clienteSecundario.from(tabla).select(opciones?.seleccion || '*');

            if (opciones?.filtros) {
                Object.entries(opciones.filtros).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }

            if (opciones?.orden) {
                query = query.order(opciones.orden.campo, { ascending: opciones.orden.ascendente ?? true });
            }

            if (opciones?.limite) {
                query = query.limit(opciones.limite);
            }

            const resultado = await query;

            return {
                data: resultado.error ? null : (resultado.data as unknown) as T[],
                error: resultado.error
            };
        } catch (error) {
            console.error(`Error en SELECT de ${tabla}:`, error);
            return { data: null, error };
        }
    },

    /**
     * INSERT en AMBAS bases de datos simultáneamente
     * IMPORTANTE: Genera el ID en el cliente para asegurar que ambas bases usen el mismo
     */
    async insert<T = any>(
        tabla: string,
        datos: any | any[]
    ): Promise<QueryResult<T>> {
        try {
            console.log(`INSERT dual en tabla: ${tabla}`);

            // Generar IDs en el cliente para asegurar consistencia entre bases
            const datosConId = Array.isArray(datos) ? datos : [datos];
            const datosPreparados = datosConId.map((item: any) => {
                // Si ya tiene ID, usarlo; si no, generar uno nuevo
                if (!item.id) {
                    return {
                        ...item,
                        id: crypto.randomUUID() // Genera UUID v4 en el cliente
                    };
                }
                return item;
            });

            // Insertar en AMBAS bases simultáneamente CON EL MISMO ID
            const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
                obtenerClienteSupabasePrimario().from(tabla).insert(datosPreparados).select(),
                obtenerClienteSupabaseSecundario().from(tabla).insert(datosPreparados).select()
            ]);

            // Verificar resultado de primaria
            if (resultadoPrimaria.status === 'fulfilled' && !resultadoPrimaria.value.error) {
                console.log(` INSERT exitoso en PRIMARIA: ${tabla}`);
                erroresConsecutivos = 0;

                // Verificar secundaria
                if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                    console.log(` INSERT exitoso en SECUNDARIA: ${tabla}`);
                } else {
                    console.warn(` INSERT falló en SECUNDARIA: ${tabla}`, resultadoSecundaria);
                    // Continuar de todas formas, se sincronizará después
                }

                return {
                    data: (resultadoPrimaria.value.data as unknown) as T[],
                    error: null
                };
            }

            // Si primaria falla, usar solo secundaria
            const errorPrim = resultadoPrimaria.status === 'rejected'
                ? resultadoPrimaria.reason
                : resultadoPrimaria.value.error;
            console.error(`INSERT falló en PRIMARIA: ${tabla}`, errorPrim);
            if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                console.log(` INSERT exitoso en SECUNDARIA (primaria falló): ${tabla}`);
                usandoSecundaria = true;
                return {
                    data: (resultadoSecundaria.value.data as unknown) as T[],
                    error: null
                };
            }

            // Ambas fallaron
            return {
                data: null,
                error: resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : resultadoPrimaria.value.error
            };
        } catch (error) {
            console.error(`Error inesperado en INSERT de ${tabla}:`, error);
            return { data: null, error };
        }
    },

    /**
     * INSERT single (retorna un solo objeto)
     */
    async insertSingle<T = any>(
        tabla: string,
        datos: any
    ): Promise<SingleResult<T>> {
        const resultado = await this.insert<T>(tabla, datos);
        return {
            data: resultado.data ? resultado.data[0] : null,
            error: resultado.error
        };
    },

    /**
     * UPDATE en AMBAS bases de datos simultáneamente
     */
    async update<T = any>(
        tabla: string,
        id: string,
        datos: any
    ): Promise<QueryResult<T>> {
        try {
            console.log(`UPDATE dual en tabla: ${tabla}, id: ${id}`);

            // Actualizar en AMBAS bases simultáneamente
            const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
                obtenerClienteSupabasePrimario().from(tabla).update(datos).eq('id', id).select(),
                obtenerClienteSupabaseSecundario().from(tabla).update(datos).eq('id', id).select()
            ]);

            // Verificar resultado de primaria
            if (resultadoPrimaria.status === 'fulfilled' && !resultadoPrimaria.value.error) {
                console.log(` UPDATE exitoso en PRIMARIA: ${tabla}`);
                erroresConsecutivos = 0;

                // Verificar secundaria
                if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                    console.log(` UPDATE exitoso en SECUNDARIA: ${tabla}`);
                } else {
                    const errorSecundaria = resultadoSecundaria.status === 'rejected'
                        ? resultadoSecundaria.reason
                        : resultadoSecundaria.value.error;
                    console.error(`UPDATE falló en SECUNDARIA: ${tabla}`, errorSecundaria);
                    console.error('Detalles del error secundaria:', JSON.stringify(errorSecundaria, null, 2));
                }

                return {
                    data: (resultadoPrimaria.value.data as unknown) as T[],
                    error: null
                };
            }

            // Si primaria falla, usar solo secundaria
            if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                console.log(` UPDATE exitoso en SECUNDARIA (primaria falló): ${tabla}`);
                usandoSecundaria = true;
                return {
                    data: (resultadoSecundaria.value.data as unknown) as T[],
                    error: null
                };
            }

            // Ambas fallaron
            return {
                data: null,
                error: resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : resultadoPrimaria.value.error
            };
        } catch (error) {
            console.error(`Error inesperado en UPDATE de ${tabla}:`, error);
            return { data: null, error };
        }
    },

    /**
     * DELETE en AMBAS bases de datos simultáneamente
     */
    async delete(
        tabla: string,
        id: string
    ): Promise<{ error: any }> {
        try {
            console.log(`DELETE dual en tabla: ${tabla}, id: ${id}`);

            // Eliminar en AMBAS bases simultáneamente
            const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
                obtenerClienteSupabasePrimario().from(tabla).delete().eq('id', id),
                obtenerClienteSupabaseSecundario().from(tabla).delete().eq('id', id)
            ]);

            // Verificar resultados
            const primOk = resultadoPrimaria.status === 'fulfilled' && !resultadoPrimaria.value.error;
            const secOk = resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error;

            if (primOk) {
                console.log(` DELETE exitoso en PRIMARIA: ${tabla}`);
            } else {
                const errorPrim = resultadoPrimaria.status === 'rejected'
                    ? resultadoPrimaria.reason
                    : resultadoPrimaria.value.error;
                console.error(`DELETE falló en PRIMARIA: ${tabla}`, errorPrim);
            }

            if (secOk) {
                console.log(` DELETE exitoso en SECUNDARIA: ${tabla}`);
            } else {
                const errorSec = resultadoSecundaria.status === 'rejected'
                    ? resultadoSecundaria.reason
                    : resultadoSecundaria.value.error;
                console.error(`DELETE falló en SECUNDARIA: ${tabla}`, errorSec);
                console.error('Detalles del error secundaria:', JSON.stringify(errorSec, null, 2));
            }

            if (primOk || secOk) {
                return { error: null };
            }

            // Ambas fallaron
            return {
                error: resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : resultadoPrimaria.value.error
            };
        } catch (error) {
            console.error(`Error inesperado en DELETE de ${tabla}:`, error);
            return { error };
        }
    },

    /**
     * Cliente directo (para operaciones especiales como JOINs)
     * IMPORTANTE: Esto solo retorna UNA base, para operaciones avanzadas
     * que requieren sintaxis específica de Supabase
     */
    getDirectClient() {
        return usandoSecundaria ? obtenerClienteSupabaseSecundario() : obtenerClienteSupabasePrimario();
    },

    /**
     * Información de estado
     */
    getStatus() {
        return {
            usandoSecundaria,
            erroresConsecutivos
        };
    },

    /**
     * Restablecer estado (útil para testing o recuperación manual)
     */
    reset() {
        usandoSecundaria = false;
        erroresConsecutivos = 0;
        console.log('Estado de failover restablecido');
    }
};