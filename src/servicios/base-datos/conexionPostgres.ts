import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clienteSupabasePrimario: SupabaseClient | null = null;
let clienteSupabaseSecundario: SupabaseClient | null = null;

/**
 * Obtiene el cliente Supabase PRIMARIO
 */
export function obtenerClienteSupabasePrimario(): SupabaseClient {
    if (!clienteSupabasePrimario) {
        const url = process.env.SUPABASE_PRIMARIA_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_PRIMARIA_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error('Variables de Supabase PRIMARIA no configuradas en .env');
        }

        clienteSupabasePrimario = createClient(url, key);
    }

    return clienteSupabasePrimario;
}

/**
 * Obtiene el cliente Supabase SECUNDARIO
 */
export function obtenerClienteSupabaseSecundario(): SupabaseClient {
    if (!clienteSupabaseSecundario) {
        // Intentar con diferentes nombres de variables
        const url = process.env.SUPABASE_SECUNDARIA_URL
            || process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL;
        const key = process.env.SUPABASE_SECUNDARIA_ANON_KEY
            || process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_ANON_KEY;

        if (!url || !key) {
            // Si no hay secundaria, usar la primaria como fallback
            console.warn(' Supabase secundaria no configurada, usando primaria');
            console.warn('Variables esperadas: NEXT_PUBLIC_SUPABASE_SECONDARY_URL y NEXT_PUBLIC_SUPABASE_SECONDARY_ANON_KEY');
            return obtenerClienteSupabasePrimario();
        }

        console.log(' Supabase secundaria configurada correctamente');
        clienteSupabaseSecundario = createClient(url, key);
    }

    return clienteSupabaseSecundario;
}

/**
 * Alias para compatibilidad con el gestor
 */
export async function obtenerPoolPostgresPrimario(): Promise<SupabaseClient> {
    return obtenerClienteSupabasePrimario();
}

/**
 * Alias para compatibilidad con el gestor
 */
export async function obtenerPoolPostgresSecundario(): Promise<SupabaseClient> {
    return obtenerClienteSupabaseSecundario();
}

/**
 * Verifica la salud de Supabase primario
 */
export async function verificarSaludPostgresPrimario(): Promise<boolean> {
    try {
        const cliente = obtenerClienteSupabasePrimario();
        // Hacer una query simple para verificar conectividad
        const { error } = await cliente.from('profesores').select('id').limit(1);

        // Si no hay error de conexión, está activo
        // (puede haber error de permisos, pero eso significa que la base responde)
        return !error || !error.message.includes('connect');
    } catch (error) {
        console.error('Error verificando salud Supabase primario:', error);
        return false;
    }
}

/**
 * Cierra las conexiones (no es necesario con Supabase, pero mantenemos por compatibilidad)
 */
export async function cerrarConexionesPostgres(): Promise<void> {
    // Supabase maneja las conexiones automáticamente
    clienteSupabasePrimario = null;
    clienteSupabaseSecundario = null;
}
