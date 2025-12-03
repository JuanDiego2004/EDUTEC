import { obtenerClienteSupabasePrimario, obtenerClienteSupabaseSecundario } from "@/servicios/base-datos/conexionPostgres";
import { obtenerClienteMongoPrimario, obtenerClienteMongoSecundario } from "@/servicios/base-datos/conexionMongo";



const TABLAS_CRITICAS = [
    'sedes',
    'grados',
    'secciones',
    'salones',
    'estudiantes',
    'profesores',
    'matriculas',
    'planes_pago',
    'cuotas_pago',
    'pagos',
    'user_roles'
];

export const sincronizador = {

    async sincronizarTodo() {
        const resultados = [];

        
        for (const tabla of TABLAS_CRITICAS) {
            try {
                const resultado = await this.sincronizarTablaSupabase(tabla);
                resultados.push({ tabla, ...resultado });
            } catch (error: any) {
                console.error(`Error sincronizando tabla ${tabla}:`, error);
                resultados.push({ tabla, estado: 'error', error: error.message });
            }
        }

        
        try {
            const resultadoMongo = await this.sincronizarLogsMongo();
            resultados.push({ tabla: 'mongodb_logs', ...resultadoMongo });
        } catch (error: any) {
            console.error('Error sincronizando MongoDB:', error);
            resultados.push({ tabla: 'mongodb_logs', estado: 'error', error: error.message });
        }

        return resultados;
    },


    async sincronizarTablaSupabase(tabla: string) {
        console.log(`🔄 Sincronizando tabla ${tabla}...`);

        const primaria = obtenerClienteSupabasePrimario();
        const secundaria = await obtenerClienteSupabaseSecundario(); 

        
        
        const { data: datosSecundaria, error: errorLectura } = await secundaria
            .from(tabla)
            .select('*');

        if (errorLectura) {
            
            if (errorLectura.message.includes('Could not find the table') || errorLectura.message.includes('schema cache')) {
                console.warn(` Tabla ${tabla} no encontrada en secundaria. Saltando.`);
                return { estado: 'warning', mensaje: 'Tabla no existe en secundaria', count: 0 };
            }
            throw new Error(`Error leyendo secundaria: ${errorLectura.message}`);
        }

        if (!datosSecundaria || datosSecundaria.length === 0) {
            return { estado: 'ok', mensaje: 'Sin datos para sincronizar', count: 0 };
        }

        
        const { error: errorEscritura } = await primaria
            .from(tabla)
            .upsert(datosSecundaria, { onConflict: 'id' }); 

        if (errorEscritura) {
            
            if (tabla === 'user_roles' && errorEscritura.message.includes('foreign key constraint')) {
                console.warn(` Advertencia en ${tabla}: Algunos usuarios no existen en Auth primaria. Intentando sincronizar uno a uno...`);

                let sincronizados = 0;
                let fallidos = 0;

                
                for (const item of datosSecundaria) {
                    const { error: errorIndividual } = await primaria
                        .from(tabla)
                        .upsert(item, { onConflict: 'id' });

                    if (!errorIndividual) sincronizados++;
                    else fallidos++;
                }

                return {
                    estado: 'warning',
                    mensaje: `Sincronización parcial: ${sincronizados} ok, ${fallidos} ignorados (usuario no existe)`,
                    count: sincronizados
                };
            }

            throw new Error(`Error escribiendo en primaria: ${errorEscritura.message}`);
        }

        return { estado: 'ok', mensaje: 'Sincronizado exitosamente', count: datosSecundaria.length };
    },

    async sincronizarLogsMongo() {
        console.log('🔄 Sincronizando MongoDB Logs...');

        
        const { obtenerClienteMongoPrimario, obtenerClienteMongoSecundario } = await import("@/servicios/base-datos/conexionMongo");

        const dbPrimaria = await obtenerClienteMongoPrimario();
        const dbSecundaria = await obtenerClienteMongoSecundario();

        const collectionName = 'logs';

        
        const logsSecundaria = await dbSecundaria
            .collection(collectionName)
            .find({})
            .sort({ fechaHora: -1 })
            .limit(1000)
            .toArray();

        if (logsSecundaria.length === 0) {
            return { estado: 'ok', mensaje: 'Sin logs para sincronizar', count: 0 };
        }

        let insertados = 0;
        let errores = 0;

        
        
        for (const log of logsSecundaria) {
            try {
                
                await dbPrimaria.collection(collectionName).updateOne(
                    { _id: log._id },
                    { $set: log },
                    { upsert: true }
                );
                insertados++;
            } catch (err) {
                errores++;
            }
        }

        return { estado: 'ok', mensaje: `Sincronizados ${insertados} logs`, count: insertados, errores };
    }
};
