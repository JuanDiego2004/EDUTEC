import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


const PRIMARIA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PRIMARIA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SECUNDARIA_URL = process.env.NEXT_PUBLIC_SUPABASE_SECONDARY_URL!;
const SECUNDARIA_KEY = process.env.SUPABASE_SECONDARY_SERVICE_ROLE_KEY!;


const TABLAS = [
    'sedes', 'ciclos_academicos', 'grados_secciones', 'cursos',
    'estudiantes', 'profesores', 'salones', 'planes_pago',
    'salon_cursos', 'matriculas', 'estudiantes_salones',
    'competencias', 'asistencias', 'evaluaciones', 'cuotas_pago',
    'pagos', 'estado_academico'
];

interface SyncResult {
    tabla: string;
    nuevos: number;
    errores: number;
}

/**
 * POST /api/sync-recovery
 * 
 * Sincroniza datos de secundaria → primaria después de recuperarse de un failover
 * 
 * Body (opcional):
 * {
 *   "desde": "2024-12-01T14:00:00Z"  
 * }
 */
export async function POST(request: NextRequest) {
    try {
        console.log('API: Iniciando sincronización de recuperación');

        
        const body = await request.json().catch(() => ({}));
        const fechaDesde = body.desde ? new Date(body.desde) : null;

        if (fechaDesde) {
            console.log(` Sincronizando desde: ${fechaDesde.toISOString()}`);
        }

        
        if (!PRIMARIA_URL || !PRIMARIA_KEY || !SECUNDARIA_URL || !SECUNDARIA_KEY) {
            return NextResponse.json(
                { error: 'Configuración de bases de datos incompleta' },
                { status: 500 }
            );
        }

        const primaria = createClient(PRIMARIA_URL, PRIMARIA_KEY);
        const secundaria = createClient(SECUNDARIA_URL, SECUNDARIA_KEY);

        const resultados: SyncResult[] = [];
        let totalNuevos = 0;
        let totalErrores = 0;

        
        for (const tabla of TABLAS) {
            const resultado = await sincronizarTabla(
                primaria,
                secundaria,
                tabla,
                fechaDesde
            );

            resultados.push(resultado);
            totalNuevos += resultado.nuevos;
            totalErrores += resultado.errores;

            
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(` Sincronización completada: ${totalNuevos} nuevos, ${totalErrores} errores`);

        return NextResponse.json({
            success: true,
            totalNuevos,
            totalErrores,
            resultados: resultados.filter(r => r.nuevos > 0 || r.errores > 0),
            mensaje: `Sincronización completada. ${totalNuevos} registros nuevos copiados.`
        });

    } catch (error: any) {
        console.error('Error en sincronización:', error);
        return NextResponse.json(
            { error: error.message || 'Error desconocido' },
            { status: 500 }
        );
    }
}

/**
 * Sincroniza una tabla de secundaria → primaria
 */
async function sincronizarTabla(
    primaria: any,
    secundaria: any,
    tabla: string,
    fechaDesde: Date | null
): Promise<SyncResult> {
    const resultado: SyncResult = { tabla, nuevos: 0, errores: 0 };

    try {
        
        let query = secundaria.from(tabla).select('*');
        if (fechaDesde) {
            query = query.gte('created_at', fechaDesde.toISOString());
        }

        const { data: datosSecundaria, error: errorSec } = await query;

        if (errorSec || !datosSecundaria || datosSecundaria.length === 0) {
            return resultado;
        }

        
        const { data: datosPrimaria } = await primaria.from(tabla).select('id');
        const idsExistentes = new Set((datosPrimaria || []).map((r: any) => r.id));

        
        const datosNuevos = datosSecundaria.filter(
            (r: any) => !idsExistentes.has(r.id)
        );

        if (datosNuevos.length === 0) {
            return resultado;
        }

        console.log(`   📦 ${tabla}: ${datosNuevos.length} registros nuevos`);

        
        const BATCH_SIZE = 100;
        for (let i = 0; i < datosNuevos.length; i += BATCH_SIZE) {
            const lote = datosNuevos.slice(i, i + BATCH_SIZE);
            const { error } = await primaria.from(tabla).insert(lote);

            if (error) {
                console.error(`   Error en ${tabla}:`, error.message);
                resultado.errores += lote.length;
            } else {
                resultado.nuevos += lote.length;
            }
        }

        return resultado;

    } catch (error: any) {
        console.error(`   Error en tabla ${tabla}:`, error);
        resultado.errores++;
        return resultado;
    }
}
