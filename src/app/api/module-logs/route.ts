import { gestorDB } from "@/servicios/base-datos/gestorConexiones";
import { NextResponse } from "next/server";


/**
 * API Profesional de Logs - Sistema de Auditoría Centralizado
 * POST /api/module-logs
 * 
 * ARQUITECTURA:
 * - Colección única: "logs" (best practice para sistemas de auditoría)
 * - Índices compuestos optimizados para queries frecuentes
 * - Campos en español para consistencia con el sistema
 * - TTL index para limpieza automática de logs antiguos
 * 
 * ESTRUCTURA DEL DOCUMENTO:
 * {
 *   usuario: { id, correo, rol },
 *   accion: { tipo, modulo, descripcion, exitoso },
 *   entidad: { tipo, id, datosPrevios, datosNuevos },
 *   metadatos: { ip, userAgent, ... },
 *   fechaHora: ISODate,
 *   creadoEn: ISODate
 * }
 * 
 * ÍNDICES RECOMENDADOS (crear en MongoDB):
 * 1. { "usuario.rol": 1, "accion.modulo": 1, "fechaHora": -1 }
 * 2. { "usuario.id": 1, "fechaHora": -1 }
 * 3. { "accion.modulo": 1, "fechaHora": -1 }
 * 4. { "accion.exitoso": 1, "fechaHora": -1 }
 * 5. { "creadoEn": 1 } con TTL de 2 años
 */

export async function POST(request: Request) {
    const DB_NAME = "reyna_de_la_paz";
    const COLLECTION_NAME = "logs"; 

    try {
        const body = await request.json();

        
        const camposRequeridos = ['idUsuario', 'correoUsuario', 'rolUsuario', 'tipoActividad', 'modulo'];
        const camposFaltantes = camposRequeridos.filter(campo => !body[campo]);

        if (camposFaltantes.length > 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Faltan campos requeridos",
                    camposFaltantes
                },
                { status: 400 }
            );
        }

        
        const documentoLog = {
            
            usuario: {
                id: body.idUsuario,
                correo: body.correoUsuario,
                rol: body.rolUsuario
            },

            
            accion: {
                tipo: body.tipoActividad,           
                modulo: body.modulo,                 
                descripcion: body.descripcion || '', 
                exitoso: body.exito !== undefined ? body.exito : true
            },

            
            entidad: {
                tipo: body.tipoEntidad || null,      
                id: body.idEntidad || null,          
                datosPrevios: body.datosPrevios || null,  
                datosNuevos: body.datosNuevos || null     
            },

            
            metadatos: {
                ...body.metadata,
                
                
                
            },

            
            fechaHora: body.fechaHora ? new Date(body.fechaHora) : new Date(),
            creadoEn: new Date()
        };

        
        await gestorDB.ejecutarConFailover(
            'mongodb',
            async (db) => {
                const dbActual = db.client ? db.client.db(DB_NAME) : db.db(DB_NAME);
                await dbActual.collection(COLLECTION_NAME).insertOne(documentoLog);
            },
            true, 
            {
                tipo: 'INSERT',
                coleccion: COLLECTION_NAME,
                datos: documentoLog
            }
        );

        return NextResponse.json({
            ok: true,
            mensaje: 'Log registrado exitosamente',
            log: {
                usuario: documentoLog.usuario.correo,
                accion: `${documentoLog.accion.tipo} en ${documentoLog.accion.modulo}`,
                timestamp: documentoLog.fechaHora
            }
        });

    } catch (error) {
        console.error("Error guardando log:", error);
        return NextResponse.json(
            {
                ok: false,
                error: 'Error al guardar el log',
                detalles: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/module-logs - Consultar logs (opcional, para dashboard)
 * 
 * Query params:
 * - rol: filtrar por rol de usuario
 * - modulo: filtrar por módulo
 * - usuario: filtrar por ID de usuario
 * - desde: fecha inicio (ISO)
 * - hasta: fecha fin (ISO)
 * - limite: número de resultados (default: 50, max: 1000)
 */
export async function GET(request: Request) {
    const DB_NAME = "reyna_de_la_paz";
    const COLLECTION_NAME = "logs";

    try {
        const { searchParams } = new URL(request.url);

        
        const filtros: any = {};

        if (searchParams.get('rol')) {
            filtros['usuario.rol'] = searchParams.get('rol');
        }

        if (searchParams.get('modulo')) {
            filtros['accion.modulo'] = searchParams.get('modulo');
        }

        if (searchParams.get('usuario')) {
            filtros['usuario.id'] = searchParams.get('usuario');
        }

        if (searchParams.get('desde') || searchParams.get('hasta')) {
            filtros['fechaHora'] = {};
            if (searchParams.get('desde')) {
                filtros['fechaHora']['$gte'] = new Date(searchParams.get('desde')!);
            }
            if (searchParams.get('hasta')) {
                filtros['fechaHora']['$lte'] = new Date(searchParams.get('hasta')!);
            }
        }

        const limite = Math.min(
            parseInt(searchParams.get('limite') || '50'),
            1000
        );

        
        const logs = await gestorDB.ejecutarConFailover(
            'mongodb',
            async (db) => {
                const dbActual = db.client ? db.client.db(DB_NAME) : db.db(DB_NAME);
                return await dbActual
                    .collection(COLLECTION_NAME)
                    .find(filtros)
                    .sort({ fechaHora: -1 })
                    .limit(limite)
                    .toArray();
            },
            false 
        );

        return NextResponse.json({
            ok: true,
            total: logs.length,
            logs
        });

    } catch (error) {
        console.error("Error consultando logs:", error);
        return NextResponse.json(
            {
                ok: false,
                error: 'Error al consultar logs',
                detalles: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
