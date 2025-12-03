import { MongoClient, Db } from 'mongodb';

let clientePrimario: MongoClient | null = null;
let clienteSecundario: MongoClient | null = null;


export async function obtenerClienteMongoPrimario(): Promise<Db> {
    if (!process.env.MONGODB_PRIMARIA_URI) {
        throw new Error('MONGODB_PRIMARIA_URI no está configurada en .env');
    }

    if (!clientePrimario) {
        clientePrimario = new MongoClient(process.env.MONGODB_PRIMARIA_URI);
        await clientePrimario.connect();
    }

    return clientePrimario.db();
}


export async function obtenerClienteMongoSecundario(): Promise<Db> {
    if (!process.env.MONGODB_SECUNDARIA_URI) {
        
        console.warn(' MONGODB_SECUNDARIA_URI no configurada, usando primaria');
        return obtenerClienteMongoPrimario();
    }

    if (!clienteSecundario) {
        clienteSecundario = new MongoClient(process.env.MONGODB_SECUNDARIA_URI);
        await clienteSecundario.connect();
    }

    return clienteSecundario.db();
}

export async function verificarSaludMongoPrimario(): Promise<boolean> {
    try {
        const db = await obtenerClienteMongoPrimario();
        const resultado = await db.admin().ping();
        return resultado.ok === 1;
    } catch (error) {
        console.error('Error verificando salud MongoDB primario:', error);
        return false;
    }
}


export async function cerrarConexionesMongo(): Promise<void> {
    if (clientePrimario) {
        await clientePrimario.close();
        clientePrimario = null;
    }
    if (clienteSecundario) {
        await clienteSecundario.close();
        clienteSecundario = null;
    }
}
