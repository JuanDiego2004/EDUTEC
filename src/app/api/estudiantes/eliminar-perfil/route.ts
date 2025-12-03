import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eliminarUsuarioDual } from '@/servicios/autenticacion/usuarioDual';


const supabasePrimarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const supabaseSecundarioAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL!,
    process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { estudiante_id } = await req.json();

        if (!estudiante_id) {
            return NextResponse.json({ error: 'estudiante_id requerido' }, { status: 400 });
        }

        console.log(`🗑️ Eliminando perfil/usuario para estudiante: ${estudiante_id}`);

        
        const [primProfile, secProfile] = await Promise.all([
            supabasePrimarioAdmin.from('profiles').select('user_id').eq('estudiante_id', estudiante_id).maybeSingle(),
            supabaseSecundarioAdmin.from('profiles').select('user_id').eq('estudiante_id', estudiante_id).maybeSingle()
        ]);

        const userId = primProfile.data?.user_id || secProfile.data?.user_id;

        
        
        
        
        const deleteResults = await Promise.allSettled([
            supabasePrimarioAdmin.from('profiles').delete().eq('estudiante_id', estudiante_id),
            supabaseSecundarioAdmin.from('profiles').delete().eq('estudiante_id', estudiante_id)
        ]);

        
        if (deleteResults[0].status === 'fulfilled') {
            console.log(' Primaria delete result:', deleteResults[0].value);
        } else {
            console.error('Primaria delete error:', deleteResults[0].reason);
        }

        if (deleteResults[1].status === 'fulfilled') {
            console.log(' Secundaria delete result:', deleteResults[1].value);
            if (deleteResults[1].value.error) {
                console.error('Error explícito en secundaria:', deleteResults[1].value.error);
            }
        } else {
            console.error('Secundaria delete error:', deleteResults[1].reason);
        }

        console.log(' Perfiles eliminados (o intentados) en ambas bases');

        
        if (userId) {
            console.log(`👤 Eliminando usuario auth asociado: ${userId}`);
            await eliminarUsuarioDual(userId);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error eliminando perfil:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
