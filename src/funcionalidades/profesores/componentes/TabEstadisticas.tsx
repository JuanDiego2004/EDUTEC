import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Label } from "@/componentes/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Salon, SalonCurso } from "@/funcionalidades/profesores/tipos/profesores.tipos";
import { BarChart3, Users } from "lucide-react";

interface TabEstadisticasProps {
    salones: Salon[];
    selectedSalon: string;
    onSelectSalon: (id: string) => void;
    salonCursos: SalonCurso[];
    selectedCurso: string;
    onSelectCurso: (id: string) => void;
    statsViewType: "general" | "curso";
    onStatsViewTypeChange: (type: "general" | "curso") => void;
    estadisticasData: any;
}

export function TabEstadisticas({
    salones,
    selectedSalon,
    onSelectSalon,
    salonCursos,
    selectedCurso,
    onSelectCurso,
    statsViewType,
    onStatsViewTypeChange,
    estadisticasData,
}: TabEstadisticasProps) {
    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Estadísticas del Aula
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                    Visualiza el rendimiento general y la asistencia de tus clases.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seleccionar Salón</Label>
                    <Select
                        value={selectedSalon}
                        onValueChange={(value) => {
                            onSelectSalon(value);
                        }}
                    >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800/50">
                            <SelectValue placeholder="Seleccione un salón" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {salones.map((salon) => (
                                <SelectItem key={salon.id} value={salon.id} className="rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:text-indigo-700 dark:focus:text-indigo-400">
                                    {salon.codigo} - {salon.grado} {salon.seccion}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedSalon && (
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de Vista</Label>
                        <Select
                            value={statsViewType}
                            onValueChange={(value: "general" | "curso") => {
                                onStatsViewTypeChange(value);
                            }}
                        >
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                <SelectItem value="general" className="rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:text-indigo-700 dark:focus:text-indigo-400">General del Salón</SelectItem>
                                <SelectItem value="curso" className="rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:text-indigo-700 dark:focus:text-indigo-400">Por Curso</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Selector de Curso (solo si es por curso) */}
                {statsViewType === "curso" && selectedSalon && (
                    <div className="space-y-3 md:col-span-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seleccionar Curso</Label>
                        <Select value={selectedCurso} onValueChange={onSelectCurso}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800/50">
                                <SelectValue placeholder="Seleccione un curso" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                {salonCursos.map((sc) => (
                                    <SelectItem key={sc.id} value={sc.id} className="rounded-lg focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:text-indigo-700 dark:focus:text-indigo-400">
                                        {sc.cursos.codigo} - {sc.cursos.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Gráficos */}
            {estadisticasData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Gráfico de Notas */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg text-white">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                Rendimiento Académico
                            </h3>
                        </div>
                        <div className="p-8">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={estadisticasData.notasData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={110}
                                            innerRadius={70}
                                            paddingAngle={3}
                                            label={({ name, percent }) =>
                                                (percent ?? 0) > 0
                                                    ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                                    : ''
                                            }
                                            dataKey="value"
                                        >
                                            {estadisticasData.notasData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                backgroundColor: '#fff',
                                                color: '#0f172a',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                padding: '12px 16px'
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '600' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico de Asistencia */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 dark:bg-emerald-600 rounded-lg text-white">
                                    <Users className="h-5 w-5" />
                                </div>
                                Asistencia
                            </h3>
                        </div>
                        <div className="p-8">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={estadisticasData.asistenciasData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={110}
                                            innerRadius={70}
                                            paddingAngle={3}
                                            label={({ name, percent }) =>
                                                (percent ?? 0) > 0
                                                    ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                                    : ''
                                            }
                                            dataKey="value"
                                        >
                                            {estadisticasData.asistenciasData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                                backgroundColor: '#fff',
                                                color: '#0f172a',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                padding: '12px 16px'
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '600' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
