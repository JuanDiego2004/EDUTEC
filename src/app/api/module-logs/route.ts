import { gestorDB } from "@/servicios/base-datos/gestorConexiones";
import { NextResponse } from "next/server";


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

        
        console.log('[Logs] Dual-write: Insertando en AMBAS bases de MongoDB...');

        const [resultadoPrimaria, resultadoSecundaria] = await Promise.allSettled([
            
            (async () => {
                const { obtenerClienteMongoPrimario } = await import('@/servicios/base-datos/conexionMongo');
                const dbPrimaria = await obtenerClienteMongoPrimario();
                return await dbPrimaria.collection(COLLECTION_NAME).insertOne(documentoLog);
            })(),
            
            (async () => {
                const { obtenerClienteMongoSecundario } = await import('@/servicios/base-datos/conexionMongo');
                const dbSecundaria = await obtenerClienteMongoSecundario();
                return await dbSecundaria.collection(COLLECTION_NAME).insertOne(documentoLog);
            })()
        ]);

        
        const primOk = resultadoPrimaria.status === 'fulfilled';
        const secOk = resultadoSecundaria.status === 'fulfilled';

        if (primOk) {
            console.log(' Log insertado en MongoDB PRIMARIA');
        } else {
            console.warn(' MongoDB PRIMARIA falló:', resultadoPrimaria.status === 'rejected' ? resultadoPrimaria.reason : 'Unknown');
        }

        if (secOk) {
            console.log(' Log insertado en MongoDB SECUNDARIA');
        } else {
            console.warn(' MongoDB SECUNDARIA falló:', resultadoSecundaria.status === 'rejected' ? resultadoSecundaria.reason : 'Unknown');
        }

        
        if (primOk || secOk) {
            return NextResponse.json({
                ok: true,
                mensaje: 'Log registrado exitosamente',
                replicacion: {
                    primaria: primOk ? 'exitosa' : 'fallida',
                    secundaria: secOk ? 'exitosa' : 'fallida'
                },
                log: {
                    usuario: documentoLog.usuario.correo,
                    accion: `${documentoLog.accion.tipo} en ${documentoLog.accion.modulo}`,
                    timestamp: documentoLog.fechaHora
                }
            });
        }

        
        console.error(' AMBAS bases de MongoDB fallaron al insertar log');
        throw new Error('No se pudo guardar el log en ninguna base de datos');

    } catch (error) {
        console.error(" Error guardando log:", error);
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

        console.log('📖 [Logs GET] Intentando leer de MongoDB PRIMARIA...');
        let logs: any[] = [];
        let fuente = '';

        
        try {
            const { obtenerClienteMongoPrimario } = await import('@/servicios/base-datos/conexionMongo');
            const dbPrimaria = await obtenerClienteMongoPrimario();
            logs = await dbPrimaria
                .collection(COLLECTION_NAME)
                .find(filtros)
                .sort({ fechaHora: -1 })
                .limit(limite)
                .toArray();

            fuente = 'primaria';
            console.log(` [Logs GET] ${logs.length} logs leídos de PRIMARIA`);
        } catch (errorPrimaria) {
            console.warn(' [Logs GET] Primaria falló, intentando SECUNDARIA...', errorPrimaria);

            
            try {
                const { obtenerClienteMongoSecundario } = await import('@/servicios/base-datos/conexionMongo');
                const dbSecundaria = await obtenerClienteMongoSecundario();
                logs = await dbSecundaria
                    .collection(COLLECTION_NAME)
                    .find(filtros)
                    .sort({ fechaHora: -1 })
                    .limit(limite)
                    .toArray();

                fuente = 'secundaria';
                console.log(` [Logs GET] ${logs.length} logs leídos de SECUNDARIA`);
            } catch (errorSecundaria) {
                console.error(' [Logs GET] AMBAS bases fallaron');
                throw new Error('No se pudo leer logs de ninguna base de datos');
            }
        }

        return NextResponse.json({
            ok: true,
            total: logs.length,
            fuente,
            logs
        });

    } catch (error) {
        console.error(" Error consultando logs:", error);
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
