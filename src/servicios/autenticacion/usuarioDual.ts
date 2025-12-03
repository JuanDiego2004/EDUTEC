/**
 * Servicio para crear usuarios en AMBAS bases de datos (primaria y secundaria)
 * Esto garantiza que los usuarios puedan iniciar sesión incluso en failover
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

// Clientes de Admin para ambas bases
const supabasePrimarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const supabaseSecundarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL!,
    process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export interface CrearUsuarioDualParams {
    email: string;
    password: string;
    role: 'admin' | 'teacher' | 'student';
    metadata?: {
        nombres?: string;
        apellidos?: string;
        [key: string]: any;
    };
}

export interface ResultadoCreacionDual {
    success: boolean;
    userId?: string;
    error?: string;
    detalles?: {
        primaria: { success: boolean; error?: string };
        secundaria: { success: boolean; error?: string };
    };
}

/**
 * Crea un usuario en AMBAS bases de datos (primaria y secundaria)
 * con las MISMAS credenciales
 */
export async function crearUsuarioDual(params: CrearUsuarioDualParams): Promise<ResultadoCreacionDual> {
    const { email, password, role, metadata = {} } = params;

    console.log(` Creando usuario dual: ${email}`);

    try {
        // 1. Crear en PRIMARIA
        const { data: dataPrimaria, error: errorPrimaria } = await supabasePrimarioAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata
        });

        if (errorPrimaria) {
            console.error('Error creando en PRIMARIA:', errorPrimaria.message);
            return {
                success: false,
                error: `Error en primaria: ${errorPrimaria.message}`,
                detalles: {
                    primaria: { success: false, error: errorPrimaria.message },
                    secundaria: { success: false, error: 'No se intentó por fallo en primaria' }
                }
            };
        }

        const userId = dataPrimaria.user!.id;
        console.log(` Usuario creado en PRIMARIA: ${userId}`);

        // 2. Crear en SECUNDARIA con el MISMO password
        const { data: dataSecundaria, error: errorSecundaria } = await supabaseSecundarioAdmin.auth.admin.createUser({
            email,
            password, // ⭐ Mismo password
            email_confirm: true,
            user_metadata: metadata
        });

        if (errorSecundaria) {
            console.error(' Error creando en SECUNDARIA:', errorSecundaria.message);
            // Usuario creado en primaria pero NO en secundaria
            // Intentar eliminar de primaria para mantener consistencia
            await supabasePrimarioAdmin.auth.admin.deleteUser(userId);

            return {
                success: false,
                error: `Error en secundaria: ${errorSecundaria.message}`,
                detalles: {
                    primaria: { success: true },
                    secundaria: { success: false, error: errorSecundaria.message }
                }
            };
        }

        const userIdSecundario = dataSecundaria.user!.id;
        console.log(` Usuario creado en SECUNDARIA: ${userIdSecundario}`);

        // 3. Guardar mapeo de IDs en AMBAS bases (tabla user_id_mapping)
        console.log(`💾 Guardando mapeo: ${userId} -> ${userIdSecundario}`);
        const mappingResults = await Promise.allSettled([
            supabasePrimarioAdmin.from('user_id_mapping').insert({
                primary_user_id: userId,
                secondary_user_id: userIdSecundario,
                email: email
            }),
            supabaseSecundarioAdmin.from('user_id_mapping').insert({
                primary_user_id: userId,
                secondary_user_id: userIdSecundario,
                email: email
            })
        ]);

        // Verificar si hubo errores al guardar el mapeo
        if (mappingResults[0].status === 'rejected') {
            console.error('Error guardando mapeo en PRIMARIA:', mappingResults[0].reason);
        } else if (mappingResults[0].value.error) {
            console.error('Error guardando mapeo en PRIMARIA:', mappingResults[0].value.error);
        } else {
            console.log(' Mapeo guardado en PRIMARIA');
        }

        if (mappingResults[1].status === 'rejected') {
            console.error('Error guardando mapeo en SECUNDARIA:', mappingResults[1].reason);
        } else if (mappingResults[1].value.error) {
            console.error('Error guardando mapeo en SECUNDARIA:', mappingResults[1].value.error);
        } else {
            console.log(' Mapeo guardado en SECUNDARIA');
        }

        // 4. Crear user_roles en AMBAS bases
        await Promise.all([
            supabasePrimarioAdmin.from('user_roles').insert({
                user_id: userId,
                role: role
            }),
            supabaseSecundarioAdmin.from('user_roles').insert({
                user_id: userIdSecundario,
                role: role
            })
        ]);

        // 5. Crear profiles en AMBAS bases
        await Promise.all([
            supabasePrimarioAdmin.from('profiles').insert({
                user_id: userId,
                profesor_id: metadata.profesor_id || null,
                estudiante_id: metadata.estudiante_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }),
            supabaseSecundarioAdmin.from('profiles').insert({
                user_id: userIdSecundario,
                profesor_id: metadata.profesor_id || null,
                estudiante_id: metadata.estudiante_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        ]);

        console.log(`Usuario dual creado exitosamente`);

        return {
            success: true,
            userId: userId,
            detalles: {
                primaria: { success: true },
                secundaria: { success: true }
            }
        };

    } catch (error) {
        console.error('Error inesperado:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
}

/**
 * Actualiza un usuario en AMBAS bases de datos
 */
export async function actualizarUsuarioDual(
    userId: string,
    updates: {
        email?: string;
        password?: string;
        metadata?: any;
    }
): Promise<ResultadoCreacionDual> {
    try {
        // Actualizar en ambas bases
        const [resPrimaria, resSecundaria] = await Promise.allSettled([
            supabasePrimarioAdmin.auth.admin.updateUserById(userId, updates),
            supabaseSecundarioAdmin.auth.admin.updateUserById(userId, updates)
        ]);

        const primSuccess = resPrimaria.status === 'fulfilled' && !resPrimaria.value.error;
        const secSuccess = resSecundaria.status === 'fulfilled' && !resSecundaria.value.error;

        return {
            success: primSuccess && secSuccess,
            userId,
            detalles: {
                primaria: {
                    success: primSuccess,
                    error: resPrimaria.status === 'rejected' ? resPrimaria.reason : undefined
                },
                secundaria: {
                    success: secSuccess,
                    error: resSecundaria.status === 'rejected' ? resSecundaria.reason : undefined
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: (error as Error).message
        };
    }
}

/**
 * Elimina un usuario de AMBAS bases de datos
 */
export async function eliminarUsuarioDual(userId: string): Promise<ResultadoCreacionDual> {
    try {
        console.log(` Iniciando eliminación dual de usuario: ${userId}`);

        // 1. Buscar el ID secundario desde el mapeo
        const { data: mapping } = await supabasePrimarioAdmin
            .from('user_id_mapping')
            .select('secondary_user_id')
            .eq('primary_user_id', userId)
            .maybeSingle();

        let secondaryUserId = mapping?.secondary_user_id;

        if (!secondaryUserId) {
            console.warn(`No se encontró mapeo para user_id: ${userId}`);
            console.log(`Intentando eliminar con el mismo ID en ambas bases...`);
            // Si no hay mapeo, usar el mismo ID (puede ser que se crearon sin mapeo)
            secondaryUserId = userId;
        } else {
            console.log(`Mapeo encontrado: ${userId} -> ${secondaryUserId}`);
        }

        // 2. Eliminar user_roles de ambas bases primero
        console.log(` Eliminando user_roles...`);
        await Promise.allSettled([
            supabasePrimarioAdmin.from('user_roles').delete().eq('user_id', userId),
            supabaseSecundarioAdmin.from('user_roles').delete().eq('user_id', secondaryUserId)
        ]);

        // 3. Eliminar profiles de ambas bases
        console.log(` Eliminando profiles...`);
        await Promise.allSettled([
            supabasePrimarioAdmin.from('profiles').delete().eq('user_id', userId),
            supabaseSecundarioAdmin.from('profiles').delete().eq('user_id', secondaryUserId)
        ]);

        // 4. Eliminar de auth en ambas bases
        console.log(` Eliminando de auth.users...`);
        const [resPrimaria, resSecundaria] = await Promise.allSettled([
            supabasePrimarioAdmin.auth.admin.deleteUser(userId),
            supabaseSecundarioAdmin.auth.admin.deleteUser(secondaryUserId)
        ]);

        // 5. Eliminar mapeo de ID (si existía)
        if (mapping) {
            console.log(` Eliminando mapeo...`);
            await Promise.allSettled([
                supabasePrimarioAdmin.from('user_id_mapping').delete().eq('primary_user_id', userId),
                supabaseSecundarioAdmin.from('user_id_mapping').delete().eq('primary_user_id', userId)
            ]);
        }

        const primSuccess = resPrimaria.status === 'fulfilled' && !resPrimaria.value.error;
        const secSuccess = resSecundaria.status === 'fulfilled' && !resSecundaria.value.error;

        console.log(`Primaria: ${primSuccess ? 'OK' : 'FALLÓ'}`);
        console.log(`Secundaria: ${secSuccess ? 'OK' : 'FALLÓ'}`);

        return {
            success: primSuccess && secSuccess,
            userId,
            detalles: {
                primaria: {
                    success: primSuccess,
                    error: resPrimaria.status === 'rejected' ? (resPrimaria.reason as Error).message :
                        (resPrimaria.value.error ? resPrimaria.value.error.message : undefined)
                },
                secundaria: {
                    success: secSuccess,
                    error: resSecundaria.status === 'rejected' ? (resSecundaria.reason as Error).message :
                        (resSecundaria.value.error ? resSecundaria.value.error.message : undefined)
                }
            }
        };
    } catch (error) {
        console.error('💥 Error inesperado en eliminación dual:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
}
