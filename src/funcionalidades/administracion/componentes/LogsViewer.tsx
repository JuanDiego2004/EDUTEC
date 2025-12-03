/**
 * Componente para visualizar los logs de actividad del sistema
 * Conectado con MongoDB a través de /api/module-logs
 */

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
} from 'lucide-react';
import { Badge } from '@/componentes/ui/badge';
import { Button } from '@/componentes/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/componentes/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/componentes/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/ui/tabs';
import { useAuth } from '@/funcionalidades/autenticacion/ganchos/useAuth';
import { toast } from 'sonner';

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

export default function LogsViewer() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");
  const [stats, setStats] = useState({
    total: 0,
    hoy: 0,
    logins: 0,
  });

  
  if (role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No tienes permisos para ver los logs del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cargarLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/module-logs?limite=200'); 

      if (!response.ok) {
        throw new Error('Error al cargar logs');
      }

      const data = await response.json();

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
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
      toast.error('Error al cargar los logs del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLogs();
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
      {/* Header Section */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Logs Card */}
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

        {/* Actividad Hoy Card */}
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

        {/* Logins Card */}
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

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Historial de Eventos</h2>
              <p className="text-sm text-muted-foreground">Registro detallado de todas las operaciones</p>
            </div>
            <div className="flex gap-2">
              {/* Aquí podrían ir filtros adicionales en el futuro */}
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
