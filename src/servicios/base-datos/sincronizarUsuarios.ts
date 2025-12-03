

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';


config();


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


const supabasePrimarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const supabaseSecundarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL,
    process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY, 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function sincronizarUsuarios() {
    console.log('Iniciando sincronización de usuarios...');

    try {
        
        const { data: usuariosPrimario, error: errorPrimario } = await supabasePrimarioAdmin.auth.admin.listUsers();

        if (errorPrimario) {
            throw new Error(`Error obteniendo usuarios primarios: ${errorPrimario.message}`);
        }

        console.log(` Usuarios encontrados en PRIMARIO: ${usuariosPrimario.users.length}`);

        
        const { data: usuariosSecundario, error: errorSecundario } = await supabaseSecundarioAdmin.auth.admin.listUsers();

        if (errorSecundario) {
            throw new Error(`Error obteniendo usuarios secundarios: ${errorSecundario.message}`);
        }

        const emailsSecundario = new Set(usuariosSecundario.users.map(u => u.email));

        
        let creados = 0;
        let actualizados = 0;
        let errores = 0;

        for (const usuario of usuariosPrimario.users) {
            try {
                if (emailsSecundario.has(usuario.email)) {
                    
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
                    
                    
                    

                    const { error } = await supabaseSecundarioAdmin.auth.admin.createUser({
                        email: usuario.email!,
                        email_confirm: true, 
                        password: generarPasswordTemporal(), 
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

        
        await sincronizarTablasPublicas(usuariosPrimario.users);

    } catch (error) {
        console.error('Error crítico en sincronización:', error);
        throw error;
    }
}


async function sincronizarTablasPublicas(usuarios: any[]) {
    console.log('\nSincronizando tablas públicas...');

    for (const usuario of usuarios) {
        try {
            
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

            
            

        } catch (error) {
            console.error(`Error sincronizando tablas para ${usuario.email}:`, error);
        }
    }

    console.log(' Tablas públicas sincronizadas');
}


function generarPasswordTemporal(): string {
    return Math.random().toString(36).slice(-12) +
        Math.random().toString(36).slice(-12) +
        '!A1'; 
}

export function iniciarSincronizacionAutomatica(intervaloMinutos: number = 30) {
    console.log(`Sincronización automática cada ${intervaloMinutos} minutos`);

    
    sincronizarUsuarios();

    
    setInterval(() => {
        sincronizarUsuarios();
    }, intervaloMinutos * 60 * 1000);
}






