import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Calendar } from "@/componentes/ui/calendar";
import { Button } from "@/componentes/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Badge } from "@/componentes/ui/badge";
import { Label } from "@/componentes/ui/label";
import { Save, Check, X, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Salon, Estudiante } from "@/funcionalidades/profesores/tipos/profesores.tipos";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/ui/popover";
import { cn } from "@/utilidades/utils";
import { CalendarIcon } from "lucide-react";

interface TabAsistenciaProps {
    salones: Salon[];
    selectedSalon: string;
    onSelectSalon: (id: string) => void;
    fecha: Date;
    onSelectFecha: (date: Date | undefined) => void;
    estudiantes: Estudiante[];
    asistencias: Record<string, string>;
    onAsistenciaChange: (estudianteId: string, estado: string) => void;
    onGuardar: () => void;
}

export function TabAsistencia({
    salones,
    selectedSalon,
    onSelectSalon,
    fecha,
    onSelectFecha,
    estudiantes,
    asistencias,
    onAsistenciaChange,
    onGuardar,
}: TabAsistenciaProps) {
    return (
        <div className="space-y-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    Control de Asistencia
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                    Registra la asistencia diaria de tus estudiantes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Salón</Label>
                    <Select value={selectedSalon} onValueChange={onSelectSalon}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800/50">
                            <SelectValue placeholder="Seleccionar salón" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {salones.map((salon) => (
                                <SelectItem key={salon.id} value={salon.id} className="rounded-lg focus:bg-emerald-50 dark:focus:bg-emerald-900/20 focus:text-emerald-700 dark:focus:text-emerald-400">
                                    {salon.codigo} - {salon.grado} {salon.seccion}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full h-12 rounded-xl justify-start text-left font-normal border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                                    !fecha && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                {fecha ? format(fecha, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-slate-200 dark:border-slate-800" align="start">
                            <Calendar
                                mode="single"
                                selected={fecha}
                                onSelect={onSelectFecha}
                                initialFocus
                                className="rounded-xl"
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={onGuardar}
                        className="w-full h-12 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/25 transition-all duration-300"
                        disabled={!selectedSalon || !fecha}
                    >
                        <Save className="mr-2 h-5 w-5" />
                        Guardar Asistencia
                    </Button>
                </div>
            </div>

            {selectedSalon && estudiantes.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Users className="h-5 w-5" />
                            </div>
                            Lista de Estudiantes
                        </h3>
                        <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {estudiantes.length} Estudiantes
                        </Badge>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                                    <TableHead className="w-16 text-center font-bold text-slate-500 uppercase text-xs tracking-wider py-4">#</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-wider py-4">Estudiante</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-xs tracking-wider py-4 w-[400px]">Estado de Asistencia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {estudiantes.map((estudiante, index) => (
                                    <TableRow key={estudiante.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-100 dark:border-slate-800">
                                        <TableCell className="text-center font-medium text-slate-400">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white text-base">
                                                    {estudiante.apellidos}, {estudiante.nombres}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                    {estudiante.dni}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-2">
                                                {[
                                                    { value: "PRESENTE", label: "Presente", icon: Check, gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600", bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-500", shadowColor: "shadow-emerald-500/10" },
                                                    { value: "TARDE", label: "Tarde", icon: Clock, gradientFrom: "from-amber-500", gradientTo: "to-amber-600", bgColor: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-500", shadowColor: "shadow-amber-500/10" },
                                                    { value: "FALTA", label: "Falta", icon: X, gradientFrom: "from-rose-500", gradientTo: "to-rose-600", bgColor: "bg-rose-50", textColor: "text-rose-700", borderColor: "border-rose-500", shadowColor: "shadow-rose-500/10" }
                                                ].map((status) => {
                                                    const isSelected = asistencias[estudiante.id] === status.value;
                                                    const Icon = status.icon;

                                                    return (
                                                        <button
                                                            key={status.value}
                                                            onClick={() => onAsistenciaChange(estudiante.id, status.value)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-bold text-sm border-2",
                                                                isSelected
                                                                    ? `bg-gradient-to-r ${status.gradientFrom} ${status.gradientTo} border-transparent text-white shadow-lg ${status.shadowColor} scale-105`
                                                                    : `${status.bgColor} dark:bg-slate-900 ${status.borderColor} dark:border-slate-700 ${status.textColor} dark:text-slate-400 hover:scale-105 hover:shadow-md`
                                                            )}
                                                        >
                                                            <Icon className={cn("h-4 w-4", isSelected ? "stroke-[3px]" : "stroke-2")} />
                                                            {status.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}
