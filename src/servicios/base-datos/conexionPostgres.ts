import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clienteSupabasePrimario: SupabaseClient | null = null;
let clienteSupabaseSecundario: SupabaseClient | null = null;

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


export function obtenerClienteSupabaseSecundario(): SupabaseClient {
    if (!clienteSupabaseSecundario) {
        
        const url = process.env.SUPABASE_SECUNDARIA_URL
            || process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL;
        const key = process.env.SUPABASE_SECUNDARIA_ANON_KEY
            || process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_ANON_KEY;

        if (!url || !key) {
            
            console.warn(' Supabase secundaria no configurada, usando primaria');
            console.warn('Variables esperadas: NEXT_PUBLIC_SUPABASE_SECONDARY_URL y NEXT_PUBLIC_SUPABASE_SECONDARY_ANON_KEY');
            return obtenerClienteSupabasePrimario();
        }

        console.log(' Supabase secundaria configurada correctamente');
        clienteSupabaseSecundario = createClient(url, key);
    }

    return clienteSupabaseSecundario;
}

export async function obtenerPoolPostgresPrimario(): Promise<SupabaseClient> {
    return obtenerClienteSupabasePrimario();
}


export async function obtenerPoolPostgresSecundario(): Promise<SupabaseClient> {
    return obtenerClienteSupabaseSecundario();
}


export async function verificarSaludPostgresPrimario(): Promise<boolean> {
    try {
        const cliente = obtenerClienteSupabasePrimario();
        
        const { error } = await cliente.from('profesores').select('id').limit(1);

        
        
        return !error || !error.message.includes('connect');
    } catch (error) {
        console.error('Error verificando salud Supabase primario:', error);
        return false;
    }
}


export async function cerrarConexionesPostgres(): Promise<void> {
    
    clienteSupabasePrimario = null;
    clienteSupabaseSecundario = null;
}
