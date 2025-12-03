import { NextResponse } from 'next/server';
import { sincronizador } from '@/servicios/sincronizacion/sincronizador';

export async function POST(request: Request) {
    try {
        console.log('🔄 [API Sync] Iniciando sincronización manual...');

        // Verificar permisos (idealmente solo admin)
        // Por simplicidad en este paso, asumimos que el middleware o el componente UI maneja la auth básica

        const resultados = await sincronizador.sincronizarTodo();

        console.log(' [API Sync] Sincronización completada:', resultados);

        return NextResponse.json({
            ok: true,
            mensaje: 'Sincronización completada',
            detalles: resultados
        });

    } catch (error: any) {
        console.error(' [API Sync] Error:', error);
        return NextResponse.json(
            {
                ok: false,
                error: 'Error en proceso de sincronización',
                detalles: error.message
            },
            { status: 500 }
        );
    }
}
