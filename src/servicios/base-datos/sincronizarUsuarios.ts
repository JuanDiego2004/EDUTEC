/**
 * Script para sincronizar usuarios de Supabase PRIMARIO a SECUNDARIO
 * Usa la Admin API que SÍ tiene acceso a auth.users
 * 
 * IMPORTANTE: Necesitas las ADMIN KEYS de ambos Supabase
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config();

// Validar que las variables existan
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('ERROR: NEXT_PUBLIC_SUPABASE_URL no está definida en .env');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida en .env');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL) {
    throw new Error('ERROR: NEXT_PUBLIC_SUPABASE_SECONDARY_URL no está definida en .env');
}
if (!process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY) {
    throw new Error('ERROR: SUPABASE_SECONDARY_SERVICE_ROLE_KEY no está definida en .env');
}

// Cliente con privilegios de ADMIN
const supabasePrimarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, //  Clave ADMIN
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const supabaseSecundarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL,
    process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY, //  Clave ADMIN
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Sincroniza TODOS los usuarios de primario a secundario
 */
export async function sincronizarUsuarios() {
    console.log('Iniciando sincronización de usuarios...');

    try {
        // 1. Obtener todos los usuarios del PRIMARIO (con Admin API)
        const { data: usuariosPrimario, error: errorPrimario } = await supabasePrimarioAdmin.auth.admin.listUsers();

        if (errorPrimario) {
            throw new Error(`Error obteniendo usuarios primarios: ${errorPrimario.message}`);
        }

        console.log(` Usuarios encontrados en PRIMARIO: ${usuariosPrimario.users.length}`);

        // 2. Obtener usuarios existentes en SECUNDARIO
        const { data: usuariosSecundario, error: errorSecundario } = await supabaseSecundarioAdmin.auth.admin.listUsers();

        if (errorSecundario) {
            throw new Error(`Error obteniendo usuarios secundarios: ${errorSecundario.message}`);
        }

        const emailsSecundario = new Set(usuariosSecundario.users.map(u => u.email));

        // 3. Sincronizar cada usuario
        let creados = 0;
        let actualizados = 0;
        let errores = 0;

        for (const usuario of usuariosPrimario.users) {
            try {
                if (emailsSecundario.has(usuario.email)) {
                    // Usuario ya existe - actualizar metadata
                    const { error } = await supabaseSecundarioAdmin.auth.admin.updateUserById(
                        usuario.id,
                        {
                            email: usuario.email,
                            user_metadata: usuario.user_metadata,
                            app_metadata: usuario.app_metadata
                        }
                    );

                    if (error) throw error;
                    actualizados++;
                    console.log(` Actualizado: ${usuario.email}`);
                } else {
                    // Usuario no existe - crear nuevo
                    //  PROBLEMA: No podemos obtener el password hasheado
                    // Solución: Crear con password temporal y pedir reset

                    const { error } = await supabaseSecundarioAdmin.auth.admin.createUser({
                        email: usuario.email!,
                        email_confirm: true, // Auto-confirmar
                        password: generarPasswordTemporal(), // Password aleatorio
                        user_metadata: usuario.user_metadata,
                        app_metadata: usuario.app_metadata
                    });

                    if (error) throw error;
                    creados++;
                    console.log(`✨ Creado: ${usuario.email} (password temporal)`);
                }
            } catch (error) {
                errores++;
                console.error(`Error con ${usuario.email}:`, error);
            }
        }

        console.log(`\n Sincronización completada:`);
        console.log(`   ✨ Creados: ${creados}`);
        console.log(`    Actualizados: ${actualizados}`);
        console.log(`   Errores: ${errores}`);

        // 4. Sincronizar también las tablas públicas (profiles, user_roles, etc.)
        await sincronizarTablasPublicas(usuariosPrimario.users);

    } catch (error) {
        console.error('🚨 Error crítico en sincronización:', error);
        throw error;
    }
}

/**
 * Sincroniza tablas públicas relacionadas con usuarios
 */
async function sincronizarTablasPublicas(usuarios: any[]) {
    console.log('\nSincronizando tablas públicas...');

    for (const usuario of usuarios) {
        try {
            // Sincronizar user_roles
            const { data: rolPrimario } = await supabasePrimarioAdmin
                .from('user_roles')
                .select('*')
                .eq('user_id', usuario.id)
                .single();

            if (rolPrimario) {
                await supabaseSecundarioAdmin
                    .from('user_roles')
                    .upsert({
                        user_id: usuario.id,
                        role: rolPrimario.role
                    });
            }

            // Sincronizar profiles
            const { data: perfilPrimario } = await supabasePrimarioAdmin
                .from('profiles')
                .select('*')
                .eq('id', usuario.id)
                .single();

            if (perfilPrimario) {
                await supabaseSecundarioAdmin
                    .from('profiles')
                    .upsert(perfilPrimario);
            }

            // Sincronizar profesor_id y estudiante_id si existen
            // ... agregar más tablas según necesites

        } catch (error) {
            console.error(`Error sincronizando tablas para ${usuario.email}:`, error);
        }
    }

    console.log(' Tablas públicas sincronizadas');
}

/**
 * Genera un password temporal seguro
 */
function generarPasswordTemporal(): string {
    return Math.random().toString(36).slice(-12) +
        Math.random().toString(36).slice(-12) +
        '!A1'; // Asegurar que cumple requisitos
}

/**
 * Configurar sincronización automática cada X minutos
 */
export function iniciarSincronizacionAutomatica(intervaloMinutos: number = 30) {
    console.log(`⏰ Sincronización automática cada ${intervaloMinutos} minutos`);

    // Sincronizar inmediatamente
    sincronizarUsuarios();

    // Programar sincronizaciones periódicas
    setInterval(() => {
        sincronizarUsuarios();
    }, intervaloMinutos * 60 * 1000);
}

// Para ejecutar manualmente
// sincronizarUsuarios();

// Para sincronización automática
// iniciarSincronizacionAutomatica(30); // cada 30 minutos
