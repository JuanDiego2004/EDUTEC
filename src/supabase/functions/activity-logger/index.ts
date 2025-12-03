/**
 * Edge Function: Activity Logger
 * 
 * Maneja todas las operaciones de logging en MongoDB desde el backend
 */

import { serve } from 'https:
import { createClient } from 'https:
import { MongoClient } from 'https:


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);


let mongoClient: MongoClient | null = null;
let mongoDb: any = null;

async function getMongoClient() {
  if (mongoClient) {
    return { client: mongoClient, db: mongoDb };
  }

  const mongoUri = Deno.env.get('MONGODB_URI');
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está configurada');
  }

  mongoClient = new MongoClient();
  await mongoClient.connect(mongoUri);
  mongoDb = mongoClient.database('school_management');

  console.log(' Conectado a MongoDB');
  return { client: mongoClient, db: mongoDb };
}

async function getCollection(collectionName: string) {
  const { db } = await getMongoClient();
  return db.collection(collectionName);
}

const handler = async (req: Request): Promise<Response> => {
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathname } = new URL(req.url);
    const { action, ...data } = await req.json();

    console.log('Activity Logger - Action:', action);

    
    if (req.method === 'POST' && action === 'log') {
      const collection = await getCollection('activity_logs');

      const document = {
        ...data,
        timestamp: new Date(),
        created_at: new Date(),
      };

      const result = await collection.insertOne(document);

      return new Response(
        JSON.stringify({
          success: true,
          log_id: result.insertedId.toString(),
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    
    if (req.method === 'POST' && action === 'get_user_logs') {
      const { user_id, limit = 50 } = data;
      const collection = await getCollection('activity_logs');

      const logs = await collection
        .find({ user_id })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return new Response(
        JSON.stringify({
          success: true,
          logs,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    
    if (req.method === 'POST' && action === 'get_recent_logs') {
      const { limit = 100 } = data;
      const collection = await getCollection('activity_logs');

      const logs = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return new Response(
        JSON.stringify({
          success: true,
          logs,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    
    if (req.method === 'POST' && action === 'get_module_logs') {
      const { module, limit = 100 } = data;
      const collection = await getCollection('activity_logs');

      const logs = await collection
        .find({ module })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return new Response(
        JSON.stringify({
          success: true,
          logs,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    
    if (req.method === 'POST' && action === 'get_stats') {
      const { user_id } = data;
      const collection = await getCollection('activity_logs');

      const filter = user_id ? { user_id } : {};
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const [totalLogs, logsHoy, loginCount] = await Promise.all([
        collection.countDocuments(filter),
        collection.countDocuments({
          ...filter,
          timestamp: { $gte: hoy },
        }),
        collection.countDocuments({
          ...filter,
          activity_type: 'login',
        }),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            total_logs: totalLogs,
            logs_hoy: logsHoy,
            total_logins: loginCount,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Acción no válida' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error en activity-logger:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
