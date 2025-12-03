import { NextResponse } from 'next/server';
import { gestorDB } from '@/servicios/base-datos/gestorConexiones';
import { verificarSaludPostgresPrimario } from '@/servicios/base-datos/conexionPostgres';
import { verificarSaludMongoPrimario } from '@/servicios/base-datos/conexionMongo';



interface AlertaWarning {
    tipo: 'WARNING';
    mensaje: string;
    operacionesPendientes: number;
}

interface AlertaInfo {
    tipo: 'INFO';
    mensaje: string;
}

type Alerta = AlertaWarning | AlertaInfo;

export async function GET() {
    try {
        const estadoSistema = gestorDB.obtenerEstadoSistema();

        
        const [saludPostgres, saludMongo] = await Promise.allSettled([
            verificarSaludPostgresPrimario(),
            verificarSaludMongoPrimario()
        ]);

        const alertas: Alerta[] = [];

        const respuesta = {
            estado: 'OK',
            timestamp: new Date().toISOString(),
            sistema: {
                inicializadoEn: estadoSistema.inicializadoEn,
                modoMantenimiento: estadoSistema.modoMantenimiento
            },
            basesDatos: {
                postgres: {
                    estado: estadoSistema.postgres.estado,
                    usandoSecundaria: estadoSistema.postgres.usandoSecundaria,
                    erroresConsecutivos: estadoSistema.postgres.erroresConsecutivos,
                    operacionesPendientes: estadoSistema.postgres.colaPendientes.length,
                    ultimaRecuperacion: estadoSistema.postgres.ultimaRecuperacion,
                    saludPrimaria: saludPostgres.status === 'fulfilled' && saludPostgres.value
                },
                mongodb: {
                    estado: estadoSistema.mongodb.estado,
                    usandoSecundaria: estadoSistema.mongodb.usandoSecundaria,
                    erroresConsecutivos: estadoSistema.mongodb.erroresConsecutivos,
                    operacionesPendientes: estadoSistema.mongodb.colaPendientes.length,
                    ultimaRecuperacion: estadoSistema.mongodb.ultimaRecuperacion,
                    saludPrimaria: saludMongo.status === 'fulfilled' && saludMongo.value
                }
            },
            alertas
        };

        if (estadoSistema.postgres.usandoSecundaria) {
            alertas.push({
                tipo: 'WARNING',
                mensaje: 'PostgreSQL usando base secundaria',
                operacionesPendientes: estadoSistema.postgres.colaPendientes.length
            });
        }

        if (estadoSistema.mongodb.usandoSecundaria) {
            alertas.push({
                tipo: 'WARNING',
                mensaje: 'MongoDB usando base secundaria',
                operacionesPendientes: estadoSistema.mongodb.colaPendientes.length
            });
        }

        if (estadoSistema.modoMantenimiento) {
            alertas.push({
                tipo: 'INFO',
                mensaje: 'Sistema en modo mantenimiento'
            });
        }

        const httpStatus = alertas.some((a) => a.tipo === 'WARNING') ? 503 : 200;

        return NextResponse.json(respuesta, { status: httpStatus });

    } catch (error) {
        console.error('Error en health check:', error);

        return NextResponse.json(
            {
                estado: 'ERROR',
                timestamp: new Date().toISOString(),
                error: (error as Error).message
            },
            { status: 500 }
        );
    }
}