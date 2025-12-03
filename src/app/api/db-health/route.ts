import { NextResponse } from 'next/server';
import { gestorDB } from '@/servicios/base-datos/gestorConexiones';


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dbType = searchParams.get('db') || 'primary';
    const dbLabel = dbType === 'primary' ? 'MongoDB Primaria' : 'MongoDB Secundaria';

    try {
        const start = Date.now();

        
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

        
        return NextResponse.json({
            ok: false,
            database: dbLabel,
            error: error.message || 'Error de conexión',
            status: 'offline',
            timestamp: new Date().toISOString(),
        }, { status: 200 }); 
    }
}
