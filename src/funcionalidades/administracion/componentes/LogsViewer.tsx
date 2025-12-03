
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  FileText,
  Edit,
  Trash,
  Eye,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Filter,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/componentes/ui/badge';
import { Button } from '@/componentes/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/componentes/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/componentes/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/ui/tabs';
import { useAuth } from '@/funcionalidades/autenticacion/ganchos/useAuth';
import { toast } from 'sonner';
import { supabaseFailover } from '@/servicios/base-datos/supabaseConRespaldo';
import { SyncDashboard } from './SyncDashboard';

const activityIcons: Record<string, any> = {
  login: LogIn,
  inicio_sesion: LogIn,
  logout: LogOut,
  cierre_sesion: LogOut,
  signup: UserPlus,
  registro: UserPlus,
  crear: FileText,
  create: FileText,
  actualizar: Edit,
  update: Edit,
  eliminar: Trash,
  delete: Trash,
  ver: Eye,
  view: Eye,
  payment: DollarSign,
  pago: DollarSign,
  error: AlertTriangle,
  security_alert: ShieldAlert,
};

const activityColors: Record<string, string> = {
  login: 'bg-green-500',
  inicio_sesion: 'bg-green-500',
  logout: 'bg-gray-500',
  cierre_sesion: 'bg-gray-500',
  signup: 'bg-blue-500',
  registro: 'bg-blue-500',
  crear: 'bg-emerald-500',
  create: 'bg-emerald-500',
  actualizar: 'bg-yellow-500',
  update: 'bg-yellow-500',
  eliminar: 'bg-red-500',
  delete: 'bg-red-500',
  ver: 'bg-purple-500',
  view: 'bg-purple-500',
  payment: 'bg-indigo-500',
  pago: 'bg-indigo-500',
  error: 'bg-red-600',
  security_alert: 'bg-orange-600',
};

interface Log {
  _id: string;
  usuario: {
    id: string;
    correo: string;
    rol: string;
  };
  accion: {
    tipo: string;
    modulo: string;
    descripcion: string;
    exitoso: boolean;
  };
  entidad?: {
    tipo?: string;
    id?: string;
  };
  fechaHora: string;
}

interface DatabaseStatus {
  name: string;
  type: 'supabase' | 'mongodb';
  role: 'primary' | 'secondary';
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  lastChecked?: Date;
}

export default function LogsViewer() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");
  const [dbStatuses, setDbStatuses] = useState<DatabaseStatus[]>([
    { name: 'Supabase Primaria', type: 'supabase', role: 'primary', status: 'checking' },
    { name: 'Supabase Secundaria', type: 'supabase', role: 'secondary', status: 'checking' },
    { name: 'MongoDB Primaria', type: 'mongodb', role: 'primary', status: 'checking' },
    { name: 'MongoDB Secundaria', type: 'mongodb', role: 'secondary', status: 'checking' },
  ]);
  const [stats, setStats] = useState({
    total: 0,
    hoy: 0,
    logins: 0,
  });


  const cargarLogs = async () => {
    
    if (role !== 'admin') {
      return;
    }


    try {
      setLoading(true);
      console.log('📊 [Logs] Cargando logs...');
      const response = await fetch('/api/module-logs?limite=200');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(' [Logs] Error:', errorData);
        throw new Error(errorData.error || 'Error al cargar logs');
      }

      const data = await response.json();
      console.log(` [Logs] ${data.logs?.length || 0} logs recibidos`);

      if (data.ok) {
        setLogs(data.logs || []);


        const total = data.logs?.length || 0;
        const hoy = new Date().toDateString();
        const logsHoy = data.logs?.filter((log: Log) =>
          new Date(log.fechaHora).toDateString() === hoy
        ).length || 0;


        const logins = data.logs?.filter((log: Log) =>
          log.accion.tipo === 'login' || log.accion.tipo === 'inicio_sesion'
        ).length || 0;

        setStats({
          total,
          hoy: logsHoy,
          logins,
        });

        
        if (data.fuente) {
          const fuenteLabel = data.fuente === 'primaria' ? 'PRIMARIA' : 'SECUNDARIA';
          console.log(`📊 Logs cargados desde MongoDB ${fuenteLabel}`);
          if (data.fuente === 'secundaria') {
            toast.info('Logs cargados desde base de datos SECUNDARIA');
          }
        }
      }
    } catch (error: any) {
      console.error(' Error cargando logs:', error);
      toast.error(`Error al cargar logs: ${error.message || 'Desconocido'}`);
      setLogs([]);
      setStats({ total: 0, hoy: 0, logins: 0 });
    } finally {
      setLoading(false);
    }
  };

  
  const checkDatabasesHealth = async () => {
    const checkStart = Date.now();

    
    const checkSupabase = async (isPrimary: boolean): Promise<{ status: 'online' | 'offline', latency?: number }> => {
      const start = Date.now();
      try {
        const client = isPrimary
          ? (await import('@/servicios/base-datos/conexionPostgres')).obtenerClienteSupabasePrimario()
          : (await import('@/servicios/base-datos/conexionPostgres')).obtenerClienteSupabaseSecundario();

        
        const { error } = await client.from('sedes').select('id').limit(1);
        const latency = Date.now() - start;

        if (error && error.message?.includes('Failed to fetch')) {
          return { status: 'offline' };
        }

        return { status: 'online', latency };
      } catch (err) {
        return { status: 'offline' };
      }
    };

    
    const checkMongoDB = async (isPrimary: boolean): Promise<{ status: 'online' | 'offline', latency?: number }> => {
      const start = Date.now();
      try {
        
        const response = await fetch(`/api/db-health?db=${isPrimary ? 'primary' : 'secondary'}`);
        const latency = Date.now() - start;

        if (!response.ok) {
          return { status: 'offline' };
        }

        const data = await response.json();
        return { status: data.ok ? 'online' : 'offline', latency };
      } catch (err) {
        return { status: 'offline' };
      }
    };

    
    const [supabasePrimary, supabaseSecondary, mongoPrimary, mongoSecondary] = await Promise.all([
      checkSupabase(true),
      checkSupabase(false),
      checkMongoDB(true),
      checkMongoDB(false),
    ]);

    
    setDbStatuses([
      {
        name: 'Supabase Primaria',
        type: 'supabase',
        role: 'primary',
        status: supabasePrimary.status,
        latency: supabasePrimary.latency,
        lastChecked: new Date(),
      },
      {
        name: 'Supabase Secundaria',
        type: 'supabase',
        role: 'secondary',
        status: supabaseSecondary.status,
        latency: supabaseSecondary.latency,
        lastChecked: new Date(),
      },
      {
        name: 'MongoDB Primaria',
        type: 'mongodb',
        role: 'primary',
        status: mongoPrimary.status,
        latency: mongoPrimary.latency,
        lastChecked: new Date(),
      },
      {
        name: 'MongoDB Secundaria',
        type: 'mongodb',
        role: 'secondary',
        status: mongoSecondary.status,
        latency: mongoSecondary.latency,
        lastChecked: new Date(),
      },
    ]);
  };

  useEffect(() => {
    cargarLogs();
    checkDatabasesHealth();

    
    const interval = setInterval(checkDatabasesHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getIconForAction = (tipo: string) => {
    const Icon = activityIcons[tipo] || Activity;
    return Icon;
  };

  const getColorForAction = (tipo: string) => {
    return activityColors[tipo] || 'bg-gray-500';
  };

  const filtrarLogsPorRol = (rol: string) => {
    if (rol === 'todos') return logs;
    return logs.filter(log => log.usuario.rol === rol);
  };

  const LogsTable = ({ data }: { data: Log[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Fecha/Hora</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No hay registros para mostrar en esta categoría
              </TableCell>
            </TableRow>
          ) : (
            data.map((log) => {
              const Icon = getIconForAction(log.accion.tipo);
              const bgColor = getColorForAction(log.accion.tipo);

              return (
                <TableRow key={log._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-full ${bgColor} bg-opacity-20`}>
                        <Icon className={`h-4 w-4 ${bgColor.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="capitalize text-xs font-medium">
                        {log.accion.tipo.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.usuario.correo}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize mt-1">
                        {log.usuario.rol}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {log.accion.modulo}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.accion.descripcion || '-'}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(log.fechaHora), 'dd MMM, HH:mm', { locale: es })}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.accion.exitoso ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Exitoso</Badge>
                    ) : (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Logs de Actividad
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitoreo y auditoría del sistema en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-sm font-medium">MongoDB Conectado</span>
          </div>
          <Button
            onClick={cargarLogs}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>


      <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Estado de Bases de Datos
                </CardTitle>
                <CardDescription className="text-sm flex items-center gap-2 mt-1">
                  <Zap className="h-3 w-3" />
                  Monitoreo en tiempo real • Actualización cada 30s
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkDatabasesHealth}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Verificar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dbStatuses.map((db, index) => {
              const StatusIcon = db.status === 'online'
                ? CheckCircle2
                : db.status === 'offline'
                  ? XCircle
                  : AlertCircle;

              const statusColor = db.status === 'online'
                ? 'text-emerald-500'
                : db.status === 'offline'
                  ? 'text-red-500'
                  : 'text-yellow-500';

              const bgColor = db.status === 'online'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : db.status === 'offline'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-yellow-500/10 border-yellow-500/20';

              const isPrimary = db.role === 'primary';

              return (
                <div
                  key={index}
                  className={`relative p-5 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${bgColor}`}
                >

                  {isPrimary && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold shadow-lg">
                      PRINCIPAL
                    </div>
                  )}

                  <div className="flex flex-col gap-3">

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${db.type === 'supabase' ? 'bg-green-500/20' : 'bg-emerald-500/20'}`}>
                          <Database className={`h-4 w-4 ${db.type === 'supabase' ? 'text-green-600' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                            {db.type === 'supabase' ? 'Supabase' : 'MongoDB'}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {db.role === 'primary' ? 'Primaria' : 'Secundaria'}
                          </p>
                        </div>
                      </div>
                      <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                    </div>


                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-black uppercase tracking-wider">Estado</span>
                        <Badge
                          variant={db.status === 'online' ? 'default' : 'destructive'}
                          className={`text-[10px] h-5 ${db.status === 'online'
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : db.status === 'offline'
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-yellow-500 hover:bg-yellow-600'
                            }`}
                        >
                          {db.status === 'online' ? 'En línea' : db.status === 'offline' ? 'Sin conexión' : 'Verificando'}
                        </Badge>
                      </div>


                      {db.latency !== undefined && db.status === 'online' && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Latencia</span>
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {db.latency}ms
                          </span>
                        </div>
                      )}


                      {db.lastChecked && (
                        <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 mt-2">
                          <span className="text-[13px] text-gray-600">
                            Última verificación: {format(db.lastChecked, 'HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Sistema de Failover:
                </span>
                <Badge variant={supabaseFailover.getStatus().usandoSecundaria ? "destructive" : "outline"} className="ml-2">
                  {supabaseFailover.getStatus().usandoSecundaria ? "USANDO SECUNDARIA" : "Modo Normal"}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {supabaseFailover.getStatus().usandoSecundaria
                  ? " Operando en modo de contingencia"
                  : " Operando con base de datos principal"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>


      <SyncDashboard />


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24 transform rotate-12" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total de Registros</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                  {stats.total.toLocaleString()}
                </h3>
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  +100%
                </span>
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 dark:bg-white w-full rounded-full" />
            </div>
          </CardContent>
        </Card>


        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Filter className="w-24 h-24 text-indigo-600 transform -rotate-12" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Actividad de Hoy</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.hoy.toLocaleString()}
                </h3>
                <span className="text-sm text-muted-foreground">eventos</span>
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[70%] rounded-full" />
            </div>
          </CardContent>
        </Card>


        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <LogIn className="w-24 h-24 text-emerald-600 transform rotate-6" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Inicios de Sesión</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.logins.toLocaleString()}
                </h3>
                <span className="text-sm text-muted-foreground">usuarios</span>

              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[45%] rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial de Eventos</h2>
              <p className="text-sm text-muted-foreground">Registro detallado de todas las operaciones</p>
            </div>
            <div className="flex gap-2">
     
            </div>
          </div>

          {role !== 'admin' ? (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20">
              <CardContent className="p-6">
                <p className="text-center text-slate-600 dark:text-slate-400">
                  No tienes permisos para ver los logs del sistema.
                </p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Contacta a un administrador si necesitas acceso.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger
                  value="todos"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Administradores
                </TabsTrigger>
                <TabsTrigger
                  value="profesor"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Profesores
                </TabsTrigger>
                <TabsTrigger
                  value="estudiante"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Estudiantes
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <RefreshCw className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    <p className="mt-4 text-slate-500 font-medium animate-pulse">Sincronizando registros...</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="todos" className="mt-0 focus-visible:outline-none">
                      <LogsTable data={filtrarLogsPorRol('todos')} />
                    </TabsContent>
                    <TabsContent value="admin" className="mt-0 focus-visible:outline-none">
                      <LogsTable data={filtrarLogsPorRol('admin')} />
                    </TabsContent>
                    <TabsContent value="profesor" className="mt-0 focus-visible:outline-none">
                      <LogsTable data={filtrarLogsPorRol('profesor')} />
                    </TabsContent>
                    <TabsContent value="estudiante" className="mt-0 focus-visible:outline-none">
                      <LogsTable data={filtrarLogsPorRol('estudiante')} />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
