"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";



const supabaseAuthUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAuthKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAuthUrl || !supabaseAuthKey) {
    throw new Error(
        'Missing Supabase Auth environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
}


export const supabaseAuth: SupabaseClient<Database> = createClient<Database>(
    supabaseAuthUrl,
    supabaseAuthKey,
    {
        auth: {
            
            storage: typeof window !== "undefined" ? localStorage : undefined,

            
            persistSession: true,

            
            autoRefreshToken: true,

            
            detectSessionInUrl: true,

            
            flowType: 'pkce', 
        },
    }
);

/**
 * Verifica si el servicio de autenticación está disponible
 * Útil para mostrar mensajes apropiados cuando la primaria está caída
 * 
 * @returns Promise<boolean> - true si Auth está disponible, false si no
 */
export async function verificarDisponibilidadAuth(): Promise<boolean> {
    try {
        
        const { error } = await supabaseAuth.auth.getSession();

        
        if (error && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
            console.warn(' [Auth] Servicio de autenticación no disponible');
            return false;
        }

        return true;
    } catch (err: any) {
        
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
            console.warn(' [Auth] Servicio de autenticación no disponible:', err.message);
            return false;
        }

        
        return true;
    }
}

/**
 * Verifica si hay una sesión válida almacenada localmente
 * Incluso si el servidor Auth está caído, si hay tokens válidos en localStorage,
 * el usuario puede seguir trabajando (hasta que expiren)
 * 
 * @returns Promise<boolean> - true si hay sesión válida local
 */
export async function tieneSesionLocalValida(): Promise<boolean> {
    try {
        const { data: { session } } = await supabaseAuth.auth.getSession();

        if (!session) {
            return false;
        }

        
        const ahora = Math.floor(Date.now() / 1000);
        const expiraEn = session.expires_at || 0;

        if (expiraEn < ahora) {
            console.log('🕐 [Auth] Sesión local expirada');
            return false;
        }

        console.log(' [Auth] Sesión local válida encontrada');
        return true;
    } catch (err) {
        console.error(' [Auth] Error verificando sesión local:', err);
        return false;
    }
}

export { supabaseAuthUrl, supabaseAuthKey };
