import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Loader2, Eye, Users } from "lucide-react";
import { Salon } from "@/funcionalidades/profesores/tipos/profesores.tipos";

interface TabSalonesProps {
    salones: Salon[];
    loading: boolean;
    onVerEstudiantes: (salon: Salon) => void;
}

export function TabSalones({ salones, loading, onVerEstudiantes }: TabSalonesProps) {
    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    Mis Salones
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                    Gestiona tus aulas y estudiantes con estilo.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse shadow-lg" />
                    ))}
                </div>
            ) : salones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-6">
                        <Users className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No tienes salones asignados</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Parece que aún no tienes cursos asignados para este periodo académico.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {salones.map((salon, index) => {
                        // Generar gradientes únicos basados en el índice
                        const gradients = [
                            "from-blue-500 to-cyan-500",
                            "from-violet-500 to-purple-500",
                            "from-pink-500 to-rose-500",
                            "from-amber-500 to-orange-500",
                            "from-emerald-500 to-teal-500",
                            "from-indigo-500 to-blue-600"
                        ];
                        const gradient = gradients[index % gradients.length];

                        return (
                            <div
                                key={salon.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-slate-100 dark:border-slate-800"
                            >
                                {/* Header con Gradiente */}
                                <div className={`h-32 bg-gradient-to-br ${gradient} p-6 relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                                        <Users className="h-24 w-24 text-white" />
                                    </div>
                                    <div className="relative z-10 text-white">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                                                {salon.codigo}
                                            </Badge>
                                        </div>
                                        <h3 className="text-3xl font-black tracking-tight mt-2">
                                            {salon.grado} {salon.seccion}
                                        </h3>
                                        <p className="text-white/90 font-medium text-sm mt-1">
                                            {salon.nivel}
                                        </p>
                                    </div>
                                </div>

                                {/* Contenido */}
                                <div className="p-6 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10`}>
                                                <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estudiantes</p>
                                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                                    {salon.estudiantes_count || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de Progreso Decorativa */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium text-slate-500">
                                            <span>Capacidad</span>
                                            <span>{((salon.estudiantes_count || 0) / 35 * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                                                style={{ width: `${Math.min(((salon.estudiantes_count || 0) / 35) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        className={`w-full h-12 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r ${gradient} hover:opacity-90 transition-opacity`}
                                        onClick={() => onVerEstudiantes(salon)}
                                    >
                                        <Eye className="mr-2 h-5 w-5" />
                                        Ver Estudiantes
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
