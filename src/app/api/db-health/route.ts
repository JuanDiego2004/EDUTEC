import { NextResponse } from 'next/server';
import { gestorDB } from '@/servicios/base-datos/gestorConexiones';

/**
 * API endpoint para verificar el estado de salud de las bases de datos MongoDB
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dbType = searchParams.get('db') || 'primary';
    const dbLabel = dbType === 'primary' ? 'MongoDB Primaria' : 'MongoDB Secundaria';

    try {
        const start = Date.now();

        // Ping directo a la base correspondiente
        if (dbType === 'primary') {
            const { obtenerClienteMongoPrimario } = await import('@/servicios/base-datos/conexionMongo');
            const db = await obtenerClienteMongoPrimario();
            await db.admin().ping();
        } else {
            const { obtenerClienteMongoSecundario } = await import('@/servicios/base-datos/conexionMongo');
            const db = await obtenerClienteMongoSecundario();
            await db.admin().ping();
        }

        const latency = Date.now() - start;

        return NextResponse.json({
            ok: true,
            database: dbLabel,
            status: 'online',
            latency,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error(`[DB Health] ${dbLabel} error:`, error.message);

        // Retornar offline status (importante: NO usar status 503, usar 200 con ok: false)
        return NextResponse.json({
            ok: false,
            database: dbLabel,
            error: error.message || 'Error de conexión',
            status: 'offline',
            timestamp: new Date().toISOString(),
        }, { status: 200 }); // Cambiar a 200 para que el frontend lo procese correctamente
    }
}
