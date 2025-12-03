import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Save, Eye, TrendingUp } from "lucide-react";
import { cn } from "@/utilidades/utils";
import { Salon, SalonCurso, Estudiante, Competencia } from "@/funcionalidades/profesores/tipos/profesores.tipos";

interface TabEvaluacionesProps {
    salones: Salon[];
    selectedSalon: string;
    onSelectSalon: (id: string) => void;
    salonCursos: SalonCurso[];
    selectedCurso: string;
    onSelectCurso: (id: string) => void;
    competencias: Competencia[];
    estudiantes: Estudiante[];
    notas: Record<string, Record<string, string>>;
    onNotaChange: (estudianteId: string, competenciaId: string, nota: string) => void;
    nombreEvaluacion: string;
    onNombreEvaluacionChange: (nombre: string) => void;
    onGuardar: () => void;
    evaluacionesGuardadas: any[];
    onVerNotasEstudiante: (estudianteId: string) => void;
    saving?: boolean;
}

export function TabEvaluaciones({
    salones,
    selectedSalon,
    onSelectSalon,
    salonCursos,
    selectedCurso,
    onSelectCurso,
    competencias,
    estudiantes,
    notas,
    onNotaChange,
    nombreEvaluacion,
    onNombreEvaluacionChange,
    onGuardar,
    evaluacionesGuardadas,
    onVerNotasEstudiante,
    saving = false,
}: TabEvaluacionesProps) {
    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:via-purple-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                    Evaluaciones
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                    Gestiona las calificaciones y competencias de tus estudiantes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seleccionar Salón</Label>
                    <Select value={selectedSalon} onValueChange={onSelectSalon}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 bg-slate-50 dark:bg-slate-800/50">
                            <SelectValue placeholder="Seleccionar salón" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {salones.map((salon) => (
                                <SelectItem key={salon.id} value={salon.id} className="rounded-lg focus:bg-violet-50 dark:focus:bg-violet-900/20 focus:text-violet-700 dark:focus:text-violet-400">
                                    {salon.codigo} - {salon.nombre || `Salón ${salon.grado}${salon.seccion}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seleccionar Curso</Label>
                    <Select
                        value={selectedCurso}
                        onValueChange={onSelectCurso}
                        disabled={!selectedSalon}
                    >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 bg-slate-50 dark:bg-slate-800/50">
                            <SelectValue placeholder="Seleccionar curso" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {salonCursos.map((sc) => (
                                <SelectItem key={sc.id} value={sc.id} className="rounded-lg focus:bg-violet-50 dark:focus:bg-violet-900/20 focus:text-violet-700 dark:focus:text-violet-400">
                                    {sc.cursos.codigo} - {sc.cursos.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedCurso && competencias.length > 0 && estudiantes.length > 0 && (
                <div className="space-y-8">
                    {/* Evaluaciones Guardadas - Vista por Estudiante */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                Evaluaciones Registradas
                            </h3>
                        </div>

                        {evaluacionesGuardadas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">No hay evaluaciones registradas aún para este curso.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {estudiantes.map((estudiante) => {
                                    const evalsEstudiante = evaluacionesGuardadas.filter(
                                        (ev: any) => ev.estudiante?.dni === estudiante.dni
                                    );
                                    if (evalsEstudiante.length === 0) return null;

                                    const promedio =
                                        evalsEstudiante.reduce((acc: number, curr: any) => acc + curr.nota, 0) /
                                        evalsEstudiante.length;

                                    const getPromedioColor = (prom: number) => {
                                        if (prom >= 17) return "text-emerald-600 dark:text-emerald-400";
                                        if (prom >= 13) return "text-blue-600 dark:text-blue-400";
                                        if (prom >= 10.5) return "text-amber-600 dark:text-amber-400";
                                        return "text-rose-600 dark:text-rose-400";
                                    };

                                    return (
                                        <div
                                            key={estudiante.id}
                                            className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1 min-w-0 pr-3">
                                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5 truncate">
                                                        {estudiante.apellidos}, {estudiante.nombres}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                        {estudiante.dni}
                                                    </p>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                    onClick={() => onVerNotasEstudiante(estudiante.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                                        Evaluaciones <span className="font-semibold text-slate-900 dark:text-white">{evalsEstudiante.length}</span>
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Promedio</p>
                                                    <p className={`text-xl font-bold ${getPromedioColor(promedio)}`}>
                                                        {promedio.toFixed(1)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Nueva Evaluación */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-violet-500 dark:bg-violet-600 rounded-lg text-white">
                                    <Save className="h-5 w-5" />
                                </div>
                                Nueva Evaluación
                            </h3>
                            <div className="w-full sm:w-80">
                                <Input
                                    placeholder="Nombre de la evaluación (ej: Parcial 1)"
                                    value={nombreEvaluacion}
                                    onChange={(e) => onNombreEvaluacionChange(e.target.value)}
                                    className="bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 h-11 focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <TableHead className="w-12 text-center font-bold text-slate-500 text-xs py-4">#</TableHead>
                                        <TableHead className="w-64 font-bold text-slate-500 text-xs py-4">Estudiante</TableHead>
                                        {competencias.map((comp) => (
                                            <TableHead key={comp.id} className="text-center min-w-[120px] py-4">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-white text-sm">{comp.nombre}</span>
                                                    <Badge variant="outline" className="text-[14px] h-5 rounded-full px-2 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400">
                                                        {comp.porcentaje}%
                                                    </Badge>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {estudiantes.map((estudiante, index) => (
                                        <TableRow key={estudiante.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-100 dark:border-slate-800">
                                            <TableCell className="text-center text-slate-400 font-medium">{index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 dark:text-white font-bold">{estudiante.apellidos}, {estudiante.nombres}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{estudiante.dni}</span>
                                                </div>
                                            </TableCell>
                                            {competencias.map((comp) => (
                                                <TableCell key={comp.id} className="p-2">
                                                    <div className="flex justify-center">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="20"
                                                            className="text-center h-10 w-20 font-mono font-bold rounded-lg focus:ring-2 focus:ring-violet-500 transition-all bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                                            placeholder="-"
                                                            value={notas[estudiante.id]?.[comp.id] || ""}
                                                            onChange={(e) =>
                                                                onNotaChange(estudiante.id, comp.id, e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button
                                onClick={onGuardar}
                                size="lg"
                                disabled={saving}
                                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 px-10 font-bold shadow-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all duration-300"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        Guardar Notas
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
