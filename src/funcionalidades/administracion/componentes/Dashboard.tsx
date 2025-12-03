import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { supabase } from "@/servicios/base-datos/supabase";
import {
  Users,
  BookOpen,
  DollarSign,
  Package,
  MapPin,
  Zap,
  Shield,
  Layers,
  CheckCircle,
  Clock
} from "lucide-react";
import { Badge } from "@/componentes/ui/badge";

const Dashboard = () => {
  const { data: estudiantes, isLoading: loadingEstudiantes } = useQuery({
    queryKey: ["estudiantes-count"],
    queryFn: async () => {
      const { count } = await supabase.from("estudiantes").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: matriculas, isLoading: loadingMatriculas } = useQuery({
    queryKey: ["matriculas-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("matriculas")
        .select("*", { count: "exact", head: true })
        .eq("estado", "activa");
      return count || 0;
    },
  });

  const { data: pagosTotal, isLoading: loadingPagos } = useQuery({
    queryKey: ["pagos-total"],
    queryFn: async () => {
      const { data } = await supabase.from("pagos").select("monto").eq("estado", "completado");
      return (data as any[])?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
    },
  });

  const { data: inventarioItems, isLoading: loadingInventario } = useQuery({
    queryKey: ["inventario-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inventario")
        .select("*", { count: "exact", head: true })
        .eq("activo", true);
      return count || 0;
    },
  });

  const { data: sedes, isLoading: loadingSedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data } = await supabase.from("sedes").select("*").eq("activo", true);
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8">
      {/* Header minimalista */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Panel de Control
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Monitoreo en tiempo real del sistema educativo
            </p>
          </div>
        </div>
      </div>

      {/* Grid asimétrico moderno */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Estudiantes - Card grande destacado */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="h-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-0 shadow-2xl shadow-indigo-500/20 overflow-hidden relative group">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
            <CardContent className="relative z-10 p-8">
              {loadingEstudiantes ? (
                <div className="animate-pulse">
                  <div className="h-6 w-32 bg-white/20 rounded mb-6" />
                  <div className="h-16 w-40 bg-white/20 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">Total de</p>
                      <h3 className="text-white text-lg font-bold">Estudiantes</h3>
                    </div>
                  </div>
                  <div className="text-7xl font-black text-white mb-2">{estudiantes}</div>
                  <p className="text-indigo-100 text-sm">estudiantes matriculados actualmente</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Matrículas - Card vertical */}
        <div className="col-span-6 lg:col-span-3">
          <Card className="h-full bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              {loadingMatriculas ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="h-12 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-5xl font-black text-slate-900 dark:text-white mb-2">{matriculas}</div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Matrículas activas</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventario - Card vertical */}
        <div className="col-span-6 lg:col-span-3">
          <Card className="h-full bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              {loadingInventario ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="h-12 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-5xl font-black text-slate-900 dark:text-white mb-2">{inventarioItems}</div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Items en inventario</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ingresos - Card horizontal destacado */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 border-0 shadow-2xl shadow-orange-500/20">
            <CardContent className="p-8 flex items-center justify-between">
              {loadingPagos ? (
                <div className="animate-pulse flex-1">
                  <div className="h-6 w-32 bg-white/20 rounded mb-4" />
                  <div className="h-12 w-56 bg-white/20 rounded" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-6 h-6 text-white" />
                      <p className="text-white font-semibold">Ingresos Totales</p>
                    </div>
                    <div className="text-5xl font-black text-white">
                      S/ {pagosTotal?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-orange-100 text-sm mt-2">Pagos completados registrados</p>
                  </div>
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <DollarSign className="w-12 h-12 text-white" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sedes - Diseño tipo Bento Box */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="h-full bg-white dark:bg-slate-900 border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">Sedes Activas</CardTitle>
                    <CardDescription>Red nacional de EduGlobal</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-bold">
                  {sedes?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSedes ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(sedes as any[])?.map((sede) => (
                    <div
                      key={sede.id}
                      className="group p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {sede.nombre}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{sede.ciudad} • {sede.direccion}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Operativa
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sistema Distribuido - Diseño horizontal moderno */}
      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">Arquitectura Distribuida</CardTitle>
              <CardDescription>Infraestructura de alta disponibilidad</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Control de Concurrencia</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sistema de bloqueos optimistas que garantiza operaciones simultáneas sin conflictos entre múltiples sedes
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-4" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Transacciones ACID</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Garantía total de integridad en cada operación crítica del sistema educativo distribuido
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800">
                <Layers className="w-8 h-8 text-violet-600 dark:text-violet-400 mb-4" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Replicación Automática</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sincronización en tiempo real entre todas las sedes con failover automático
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;