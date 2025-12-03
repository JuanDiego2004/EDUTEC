

import { obtenerClienteSupabasePrimario, obtenerClienteSupabaseSecundario } from "./conexionPostgres";

export interface QueryResult<T> {
    data: T[] | null;
    error: any;
}

export interface SingleResult<T> {
    data: T | null;
    error: any;
}


let usandoSecundaria = false;
let erroresConsecutivos = 0;

let timestampUltimoFailover: Date | null = null;

let onPrimariaRecuperada: ((timestamp: Date) => void) | null = null;

export function registrarCallbackRecuperacion(callback: (timestamp: Date) => void) {
    onPrimariaRecuperada = callback;
}

export function obtenerTimestampFailover(): Date | null {
    return timestampUltimoFailover;
}

export const supabaseFailover = {

    async select<T = any>(
        tabla: string,
        opciones?: {
            seleccion?: string;
            filtros?: Record<string, any>;
            orden?: { campo: string; ascendente?: boolean };
            limite?: number;
        }
    ): Promise<QueryResult<T>> {
        
        if (!usandoSecundaria) {
            try {
                console.log(`📊 [SELECT] Intentando con PRIMARIA: ${tabla}`);
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
                    console.log(` [SELECT] PRIMARIA exitosa: ${tabla}`);
                    erroresConsecutivos = 0;

                    
                    if (usandoSecundaria) {
                        console.log('🎉 PRIMARIA RECUPERADA - Reiniciando modo normal');
                        usandoSecundaria = false;

                        
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

                
                console.warn(` [SELECT] PRIMARIA retornó error: ${tabla}`, resultado.error);
                erroresConsecutivos++;

                if (erroresConsecutivos >= 2) {
                    console.warn(`🔄 [FAILOVER] Cambiando a SECUNDARIA después de ${erroresConsecutivos} errores`);

                    if (!usandoSecundaria && !timestampUltimoFailover) {
                        timestampUltimoFailover = new Date();
                        console.warn(`Timestamp de failover: ${timestampUltimoFailover.toISOString()}`);
                    }

                    usandoSecundaria = true;
                }
            } catch (error: any) {
                
                console.error(` [SELECT] PRIMARIA falló completamente (network error): ${tabla}`, error);
                console.error(`Error type: ${error?.name}, Message: ${error?.message}`);

                
                if (!usandoSecundaria) {
                    console.warn('[FAILOVER INMEDIATO] Error de conexión detectado, cambiando a SECUNDARIA');

                    if (!timestampUltimoFailover) {
                        timestampUltimoFailover = new Date();
                        console.warn(`Timestamp de failover: ${timestampUltimoFailover.toISOString()}`);
                    }

                    usandoSecundaria = true;
                    erroresConsecutivos = 999; 
                }

                
            }
        }

        
        try {
            console.log(`📊 [SELECT] Usando SECUNDARIA: ${tabla}`);
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

            if (!resultado.error) {
                console.log(` [SELECT] SECUNDARIA exitosa: ${tabla}`);
            } else {
                console.error(` [SELECT] SECUNDARIA también falló: ${tabla}`, resultado.error);
            }

            return {
                data: resultado.error ? null : (resultado.data as unknown) as T[],
                error: resultado.error
            };
        } catch (error) {
            console.error(` [SELECT] SECUNDARIA falló completamente (network error): ${tabla}`, error);
            return { data: null, error };
        }
    },

 
    async insert<T = any>(
        tabla: string,
        datos: any | any[]
    ): Promise<QueryResult<T>> {
        try {
            console.log(`INSERT dual en tabla: ${tabla}`);

            
            const datosConId = Array.isArray(datos) ? datos : [datos];
            const datosPreparados = datosConId.map((item: any) => {
                
                if (!item.id) {
                    return {
                        ...item,
                        id: crypto.randomUUID() 
                    };
                }
                return item;
            });

            
            const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
                obtenerClienteSupabasePrimario().from(tabla).insert(datosPreparados).select(),
                obtenerClienteSupabaseSecundario().from(tabla).insert(datosPreparados).select()
            ]);

            
            if (resultadoPrimaria.status === 'fulfilled' && !resultadoPrimaria.value.error) {
                console.log(` INSERT exitoso en PRIMARIA: ${tabla}`);
                erroresConsecutivos = 0;

                
                if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                    console.log(` INSERT exitoso en SECUNDARIA: ${tabla}`);
                } else {
                    console.warn(` INSERT falló en SECUNDARIA: ${tabla}`, resultadoSecundaria);
                    
                }

                return {
                    data: (resultadoPrimaria.value.data as unknown) as T[],
                    error: null
                };
            }

            
            const errorPrim = resultadoPrimaria.status === 'rejected'
                ? resultadoPrimaria.reason
                : resultadoPrimaria.value.error;
            console.warn(` INSERT falló en PRIMARIA: ${tabla}`, errorPrim);
            if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                console.log(` INSERT exitoso en SECUNDARIA (primaria falló): ${tabla}`);
                usandoSecundaria = true;
                return {
                    data: (resultadoSecundaria.value.data as unknown) as T[],
                    error: null
                };
            }

            
            console.error(` INSERT falló en AMBAS bases: ${tabla}`);
            return {
                data: null,
                error: resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : resultadoPrimaria.value.error
            };
        } catch (error) {
            console.warn(` Excepción en INSERT de ${tabla}:`, error);
            return { data: null, error };
        }
    },

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

    async update<T = any>(
        tabla: string,
        id: string,
        datos: any
    ): Promise<QueryResult<T>> {
        try {
            console.log(`UPDATE dual en tabla: ${tabla}, id: ${id}`);

            
            const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
                obtenerClienteSupabasePrimario().from(tabla).update(datos).eq('id', id).select(),
                obtenerClienteSupabaseSecundario().from(tabla).update(datos).eq('id', id).select()
            ]);

            
            if (resultadoPrimaria.status === 'fulfilled' && !resultadoPrimaria.value.error) {
                console.log(` UPDATE exitoso en PRIMARIA: ${tabla}`);
                erroresConsecutivos = 0;

                
                if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                    console.log(` UPDATE exitoso en SECUNDARIA: ${tabla}`);
                } else {
                    const errorSecundaria = resultadoSecundaria.status === 'rejected'
                        ? resultadoSecundaria.reason
                        : resultadoSecundaria.value.error;
                    console.warn(` UPDATE falló en SECUNDARIA: ${tabla}`, errorSecundaria);
                }

                return {
                    data: (resultadoPrimaria.value.data as unknown) as T[],
                    error: null
                };
            }

            
            console.warn(` UPDATE falló en PRIMARIA: ${tabla}`);
            if (resultadoSecundaria.status === 'fulfilled' && !resultadoSecundaria.value.error) {
                console.log(` UPDATE exitoso en SECUNDARIA (primaria falló): ${tabla}`);
                usandoSecundaria = true;
                return {
                    data: (resultadoSecundaria.value.data as unknown) as T[],
                    error: null
                };
            }

            
            console.error(` UPDATE falló en AMBAS bases: ${tabla}`);
            return {
                data: null,
                error: resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : resultadoPrimaria.value.error
            };
        } catch (error) {
            console.warn(` Excepción en UPDATE de ${tabla}:`, error);
            return { data: null, error };
        }
    },


    async delete(
        tabla: string,
        id: string
    ): Promise<{ error: any }> {
        console.log(`🗑️ [DELETE] Iniciando delete en tabla: ${tabla}, id: ${id}`);

        
        if (usandoSecundaria) {
            console.log(`📍 [DELETE] Usando SOLO SECUNDARIA (modo failover activo)`);
            try {
                const { error } = await obtenerClienteSupabaseSecundario()
                    .from(tabla)
                    .delete()
                    .eq('id', id);

                if (!error) {
                    console.log(` [DELETE] SECUNDARIA exitosa: ${tabla}`);
                    return { error: null };
                }

                console.error(` [DELETE] SECUNDARIA falló: ${tabla}`, error);
                return { error };
            } catch (error: any) {
                console.error(` [DELETE] Excepción en SECUNDARIA: ${tabla}`, error);
                return { error };
            }
        }

        
        try {
            console.log(`📍 [DELETE] Intentando con PRIMARIA...`);

            const { error: errorPrimaria } = await obtenerClienteSupabasePrimario()
                .from(tabla)
                .delete()
                .eq('id', id);

            if (!errorPrimaria) {
                console.log(` [DELETE] PRIMARIA exitosa: ${tabla}`);

                
                try {
                    await obtenerClienteSupabaseSecundario()
                        .from(tabla)
                        .delete()
                        .eq('id', id);
                    console.log(` [DELETE] SECUNDARIA también exitosa: ${tabla}`);
                } catch (err) {
                    console.warn(` [DELETE] Secundaria falló (pero primaria ok): ${tabla}`);
                }

                return { error: null };
            }

            
            console.warn(` [DELETE] PRIMARIA retornó error: ${tabla}`, errorPrimaria);

            
            const { error: errorSecundaria } = await obtenerClienteSupabaseSecundario()
                .from(tabla)
                .delete()
                .eq('id', id);

            if (!errorSecundaria) {
                console.log(` [DELETE] SECUNDARIA exitosa (primaria falló): ${tabla}`);
                return { error: null };
            }

            
            console.error(` [DELETE] Ambas bases fallaron: ${tabla}`);
            return { error: errorPrimaria };

        } catch (error: any) {
            
            console.warn(` [DELETE] Primaria lanzó excepción (network error): ${tabla}`, error);

            
            if (error?.message?.includes('Failed to fetch') ||
                error?.message?.includes('NetworkError') ||
                error?.name === 'TypeError') {

                console.warn(`[DELETE] Activando failover por error de red`);
                usandoSecundaria = true;
                erroresConsecutivos = 999;

                if (!timestampUltimoFailover) {
                    timestampUltimoFailover = new Date();
                }
            }

            
            try {
                const { error: errorSecundaria } = await obtenerClienteSupabaseSecundario()
                    .from(tabla)
                    .delete()
                    .eq('id', id);

                if (!errorSecundaria) {
                    console.log(` [DELETE] SECUNDARIA exitosa (primaria con excepción): ${tabla}`);
                    return { error: null };
                }

                console.error(` [DELETE] SECUNDARIA también falló: ${tabla}`, errorSecundaria);
                return { error: errorSecundaria };
            } catch (error2) {
                console.error(` [DELETE] Excepción en SECUNDARIA también: ${tabla}`, error2);
                return { error: error2 };
            }
        }
    },


    getDirectClient() {
        const cliente = usandoSecundaria ? obtenerClienteSupabaseSecundario() : obtenerClienteSupabasePrimario();
        const tipo = usandoSecundaria ? 'SECUNDARIA' : 'PRIMARIA';
        console.log(`🔌 [getDirectClient] Retornando cliente ${tipo}`);
        return cliente;
    },

    getStatus() {
        return {
            usandoSecundaria,
            erroresConsecutivos,
            timestampFailover: timestampUltimoFailover
        };
    },


    forceFailover(reason?: string) {
        if (!usandoSecundaria) {
            console.warn(`[FAILOVER FORZADO] ${reason || 'Razón no especificada'}`);
            usandoSecundaria = true;
            erroresConsecutivos = 999;

            if (!timestampUltimoFailover) {
                timestampUltimoFailover = new Date();
                console.warn(`Timestamp de failover: ${timestampUltimoFailover.toISOString()}`);
            }
        }
    },


    reset() {
        usandoSecundaria = false;
        erroresConsecutivos = 0;
        timestampUltimoFailover = null;
        console.log('♻️ Estado de failover restablecido');
    }
};