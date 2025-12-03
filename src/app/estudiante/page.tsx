"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/servicios/base-datos/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { GraduationCap, BookOpen, Calendar as CalendarIcon, Trophy, BarChart3, LogOut, CreditCard, FileText } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { useAuth } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import { Badge } from "@/componentes/ui/badge";
import { Progress } from "@/componentes/ui/progress";
import { Calendar } from "@/componentes/ui/calendar";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { generarBoletaNotas } from "@/servicios/pdf/generarBoletaPDF";

const COLORS = {
    aprobado: "hsl(var(--chart-2))",
    desaprobado: "hsl(var(--chart-1))",
    presente: "hsl(var(--chart-3))",
    ausente: "hsl(var(--chart-4))",
};

const StudentDashboard = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const { signOut, user, loading: authLoading } = useAuth();
    
    const [loading, setLoading] = useState(true);

    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [salon, setSalon] = useState<any>(null);
    const [rendimientoGeneral, setRendimientoGeneral] = useState<any[]>([]);
    const [asistenciaData, setAsistenciaData] = useState<any[]>([]);
    const [cursoStats, setCursoStats] = useState<any[]>([]);

    const [cursos, setCursos] = useState<any[]>([]);

    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);

    const [ranking, setRanking] = useState<any[]>([]);
    const [myPosition, setMyPosition] = useState<number>(0);

    const [planPago, setPlanPago] = useState<any>(null);
    const [cuotas, setCuotas] = useState<any[]>([]);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedAsistencia, setSelectedAsistencia] = useState<any>(null);

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                loadStudentData();
            } else {
                setLoading(false);
            }
        }
    }, [user, authLoading]);

    const loadStudentData = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            
            if (!studentInfo) setLoading(true);

            const { data: profile } = await supabase
                .from("profiles")
                .select("*, estudiantes(*)")
                .eq("user_id", user.id)
                .single();

            if (!profile || !(profile as any).estudiante_id) {
                toast.error("No se encontró información del estudiante");
                return;
            }

            setStudentInfo((profile as any).estudiantes);

            const { data: estudianteSalon } = await supabase
                .from("estudiantes_salones")
                .select(`
          *,
          salones(
            *,
            profesores(nombres, apellidos),
            ciclos_academicos(nombre, fecha_inicio, fecha_fin)
          )
        `)
                .eq("estudiante_id", (profile as any).estudiante_id)
                .eq("activo", true)
                .order("fecha_asignacion", { ascending: false })
                .limit(1)
                .single();

            setSalon((estudianteSalon as any)?.salones);

            const { data: matriculas } = await supabase
                .from("matriculas")
                .select(`
          *,
          cursos(*, salon_cursos(id)),
          estado_academico(promedio, estado)
        `)
                .eq("estudiante_id", (profile as any).estudiante_id)
                .eq("estado", "activa");

            if (matriculas) {
                const matriculasTyped = matriculas as any[];
                const totalCursos = matriculasTyped.length;
                const aprobados = matriculasTyped.filter(m => m.estado_academico?.[0]?.promedio >= 11).length;
                const desaprobados = totalCursos - aprobados;

                setRendimientoGeneral([
                    { name: "Aprobados", value: aprobados },
                    { name: "Desaprobados", value: desaprobados }
                ]);

                const statsData = matriculasTyped.map(m => ({
                    nombre: m.cursos?.nombre,
                    promedio: m.estado_academico?.[0]?.promedio || 0,
                    estado: m.estado_academico?.[0]?.estado || "en_curso"
                }));
                setCursoStats(statsData);

                await loadCursosConCompetencias(matriculasTyped);
            }

            await loadAsistencias((matriculas as any[])?.map((m: any) => m.id) || []);

            if ((estudianteSalon as any)?.salon_id) {
                await loadRanking((estudianteSalon as any).salon_id, (profile as any).estudiante_id);
            }

            await loadPlanPago((profile as any).estudiante_id);

        } catch (error) {
            console.error("Error loading student data:", error);
            toast.error("Error al cargar información del estudiante");
        } finally {
            setLoading(false);
        }
    };

    const loadCursosConCompetencias = async (matriculas: any[]) => {
        const cursosData = await Promise.all(
            matriculas.map(async (m) => {
                const salonCursoId = m.cursos?.salon_cursos?.[0]?.id;

                let competencias: any[] = [];
                if (salonCursoId) {
                    const { data: comps } = await supabase
                        .from("competencias")
                        .select("*")
                        .eq("salon_curso_id", salonCursoId);
                    competencias = comps || [];
                }

                const { data: evaluaciones } = await supabase
                    .from("evaluaciones")
                    .select("*")
                    .eq("matricula_id", m.id)
                    .order("fecha_evaluacion", { ascending: false });

                const evaluacionesPorNombre: Record<string, any[]> = {};
                (evaluaciones || []).forEach((ev: any) => {
                    const nombreEval = ev.tipo_evaluacion.split(' - ')[0] || ev.tipo_evaluacion;
                    if (!evaluacionesPorNombre[nombreEval]) {
                        evaluacionesPorNombre[nombreEval] = [];
                    }
                    evaluacionesPorNombre[nombreEval].push(ev);
                });

                const evaluacionesAgrupadas = Object.entries(evaluacionesPorNombre).map(([nombre, evals]) => {
                    const promedio = evals.reduce((acc, ev) => acc + (Number(ev.nota) * Number(ev.peso)), 0);
                    return { nombre, promedio, evaluaciones: evals };
                });

                const promedioGeneral = evaluacionesAgrupadas.length > 0
                    ? evaluacionesAgrupadas.reduce((sum, ev) => sum + ev.promedio, 0) / evaluacionesAgrupadas.length
                    : 0;

                return {
                    id: m.cursos?.id,
                    nombre: m.cursos?.nombre,
                    codigo: m.cursos?.codigo,
                    promedio: promedioGeneral,
                    estado: m.estado_academico?.[0]?.estado || "en_curso",
                    competencias,
                    evaluacionesAgrupadas
                };
            })
        );

        setCursos(cursosData);
    };

    const loadAsistencias = async (matriculaIds: string[]) => {
        if (!matriculaIds || matriculaIds.length === 0) {
            setAsistencias([]);
            setAsistenciaData([]);
            return;
        }

        const { data } = await supabase
            .from("asistencias")
            .select("*")
            .in("matricula_id", matriculaIds)
            .order("fecha", { ascending: false });

        if (data) {
            const dataTyped = data as any[];
            setAsistencias(dataTyped);

            const presente = dataTyped.filter(a => a.presente).length;
            const ausente = dataTyped.filter(a => !a.presente).length;

            setAsistenciaData([
                { name: "Presente", value: presente },
                { name: "Ausente", value: ausente }
            ]);

            const dates = dataTyped.filter(a => a.presente).map(a => {
                
                const [year, month, day] = a.fecha.split('-').map(Number);
                return new Date(year, month - 1, day);
            });
            setSelectedDates(dates);
        }
    };

    const loadRanking = async (salonId: string, currentEstudianteId: string) => {
        try {
            const { data: estudiantesSalon } = await supabase
                .from("estudiantes_salones")
                .select("estudiante_id")
                .eq("salon_id", salonId)
                .eq("activo", true);

            if (!estudiantesSalon) return;

            const estudiantesIds = (estudiantesSalon as any[]).map(es => es.estudiante_id);

            const rankingData = await Promise.all(
                estudiantesIds.map(async (estudianteId) => {
                    const { data: estudiante } = await supabase
                        .from("estudiantes")
                        .select("nombres, apellidos")
                        .eq("id", estudianteId)
                        .single();

                    const { data: matriculas } = await supabase
                        .from("matriculas")
                        .select("id, cursos(*)")
                        .eq("estudiante_id", estudianteId)
                        .eq("estado", "activa");

                    const matriculasTyped = matriculas as any[];
                    const promediosPorCurso = await Promise.all(
                        (matriculasTyped || []).map(async (m) => {
                            const { data: evaluaciones } = await supabase
                                .from("evaluaciones")
                                .select("*")
                                .eq("matricula_id", m.id);

                            if (!evaluaciones || evaluaciones.length === 0) return 0;

                            const evaluacionesTyped = evaluaciones as any[];
                            const evaluacionesPorNombre: Record<string, any[]> = {};
                            evaluacionesTyped.forEach((ev: any) => {
                                const nombreEval = ev.tipo_evaluacion.split(' - ')[0] || ev.tipo_evaluacion;
                                if (!evaluacionesPorNombre[nombreEval]) {
                                    evaluacionesPorNombre[nombreEval] = [];
                                }
                                evaluacionesPorNombre[nombreEval].push(ev);
                            });

                            const evaluacionesAgrupadas = Object.entries(evaluacionesPorNombre).map(([nombre, evals]) => {
                                const promedio = evals.reduce((acc, ev) => acc + (Number(ev.nota) * Number(ev.peso)), 0);
                                return promedio;
                            });

                            return evaluacionesAgrupadas.length > 0
                                ? evaluacionesAgrupadas.reduce((sum, p) => sum + p, 0) / evaluacionesAgrupadas.length
                                : 0;
                        })
                    );

                    const promedioGeneral = promediosPorCurso.length > 0
                        ? promediosPorCurso.reduce((a, b) => a + b, 0) / promediosPorCurso.length
                        : 0;

                    return {
                        id: estudianteId,
                        nombre: `${(estudiante as any)?.nombres} ${(estudiante as any)?.apellidos}`,
                        promedio: promedioGeneral,
                        isMe: estudianteId === currentEstudianteId
                    };
                })
            );

            const sortedRanking = rankingData.sort((a, b) => b.promedio - a.promedio);
            setRanking(sortedRanking);

            
            const position = sortedRanking.findIndex(r => r.isMe);
            setMyPosition(position + 1);

        } catch (error) {
            console.error("Error loading ranking:", error);
        }
    };

    const loadPlanPago = async (estudianteId: string) => {
        try {
            
            const { data: matricula } = await supabase
                .from("matriculas")
                .select("plan_pago_id")
                .eq("estudiante_id", estudianteId)
                .eq("estado", "activa")
                .not("plan_pago_id", "is", null)
                .order("fecha_matricula", { ascending: false })
                .limit(1)
                .maybeSingle();

            let plan = null as any;

            if ((matricula as any)?.plan_pago_id) {
                const { data: planByMat } = await supabase
                    .from("planes_pago")
                    .select(`
            *,
            ciclos_academicos(nombre)
          `)
                    .eq("id", (matricula as any).plan_pago_id)
                    .maybeSingle();
                plan = planByMat;
            }

            
            if (!plan) {
                const { data: planByStudent } = await supabase
                    .from("planes_pago")
                    .select(`
            *,
            ciclos_academicos(nombre)
          `)
                    .eq("estudiante_id", estudianteId)
                    .eq("activo", true)
                    .maybeSingle();
                plan = planByStudent;
            }

            if (plan) {
                setPlanPago(plan);
                const { data: cuotasData } = await supabase
                    .from("cuotas_pago")
                    .select("*")
                    .eq("plan_pago_id", plan.id)
                    .order("numero_cuota", { ascending: true });
                setCuotas(cuotasData || []);
            } else {
                setPlanPago(null);
                setCuotas([]);
            }
        } catch (error) {
            console.error("Error loading plan de pago:", error);
        }
    };

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const dateStr = format(date, "yyyy-MM-dd");
            const asistenciaEnFecha = asistencias.find(
                a => a.fecha === dateStr
            );
            setSelectedAsistencia(asistenciaEnFecha || null);
        } else {
            setSelectedAsistencia(null);
        }
    };

    const handleDescargarBoleta = () => {
        if (!studentInfo || !salon || cursos.length === 0) {
            toast.error("No hay suficiente información para generar la boleta");
            return;
        }

        try {
            const promedioGeneral = cursos.reduce((sum, c) => sum + c.promedio, 0) / cursos.length;

            generarBoletaNotas({
                estudiante: {
                    nombres: studentInfo.nombres,
                    apellidos: studentInfo.apellidos,
                    dni: studentInfo.dni,
                    codigo: studentInfo.codigo,
                },
                salon: {
                    nombre: salon.nombre,
                    nivel: salon.nivel,
                    grado: salon.grado,
                    seccion: salon.seccion,
                    profesor: salon.profesores ? {
                        nombres: salon.profesores.nombres,
                        apellidos: salon.profesores.apellidos,
                    } : undefined,
                    ciclo: salon.ciclos_academicos ? {
                        nombre: salon.ciclos_academicos.nombre,
                        fecha_inicio: salon.ciclos_academicos.fecha_inicio,
                        fecha_fin: salon.ciclos_academicos.fecha_fin,
                    } : undefined,
                },
                cursos: cursos,
                promedioGeneral: promedioGeneral,
            });

            toast.success("Boleta de notas descargada exitosamente");
        } catch (error) {
            console.error("Error generando boleta:", error);
            toast.error("Error al generar la boleta de notas");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-12 bg-indigo-600 rounded-full" />
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Portal del Estudiante
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            {studentInfo?.nombres} {studentInfo?.apellidos}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={signOut}
                    className="border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:border-indigo-900 dark:hover:bg-indigo-900/20 transition-colors"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <TabsTrigger
                        value="dashboard"
                        className="flex flex-col md:flex-row items-center gap-2 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/20 dark:data-[state=active]:text-indigo-400 transition-all"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden md:inline font-medium">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="cursos"
                        className="flex flex-col md:flex-row items-center gap-2 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/20 dark:data-[state=active]:text-indigo-400 transition-all"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden md:inline font-medium">Mis Cursos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="asistencia"
                        className="flex flex-col md:flex-row items-center gap-2 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/20 dark:data-[state=active]:text-indigo-400 transition-all"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        <span className="hidden md:inline font-medium">Asistencia</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="pagos"
                        className="flex flex-col md:flex-row items-center gap-2 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/20 dark:data-[state=active]:text-indigo-400 transition-all"
                    >
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden md:inline font-medium">Mis Pagos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="ranking"
                        className="flex flex-col md:flex-row items-center gap-2 py-3 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/20 dark:data-[state=active]:text-indigo-400 transition-all"
                    >
                        <Trophy className="h-4 w-4" />
                        <span className="hidden md:inline font-medium">Ranking</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6">
                    {/* Info del Salón */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-none shadow-lg">
                        <CardContent className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Mi Salón</h2>
                                    {salon ? (
                                        <div className="space-y-1 text-indigo-100">
                                            <p className="text-lg font-medium">
                                                {salon.nombre || `${salon.nivel} - ${salon.grado} "${salon.seccion}"`}
                                            </p>
                                            <p className="text-sm opacity-90">
                                                Profesor: {salon.profesores ? `${salon.profesores.nombres} ${salon.profesores.apellidos}` : "No asignado"}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-indigo-100">No estás asignado a ningún salón</p>
                                    )}
                                </div>
                                {salon?.ciclos_academicos && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <p className="text-md font-medium uppercase tracking-wider opacity-75 mb-1">Ciclo Académico</p>
                                        <p className="font-bold text-lg">{salon.ciclos_academicos.nombre}</p>
                                        <p className="text-md mt-1 opacity-90">
                                            {format(new Date(salon.ciclos_academicos.fecha_inicio), "dd MMM yyyy", { locale: es })} - {format(new Date(salon.ciclos_academicos.fecha_fin), "dd MMM yyyy", { locale: es })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Rendimiento General</CardTitle>
                                <CardDescription>Estado de todos tus cursos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {rendimientoGeneral.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={rendimientoGeneral}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {rendimientoGeneral.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.name === "Aprobados" ? "#4f46e5" : "#ef4444"} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-slate-400">
                                        No hay datos disponibles
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Asistencia</CardTitle>
                                <CardDescription>Resumen de tu asistencia</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {asistenciaData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={asistenciaData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {asistenciaData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.name === "Presente" ? "#10b981" : "#f59e0b"} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[250px] flex items-center justify-center text-slate-400">
                                        No hay datos disponibles
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Rendimiento por Curso</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {cursoStats.map((curso, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{curso.nombre}</span>
                                            <span className={`font-bold ${curso.promedio >= 10.5 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                {curso.promedio.toFixed(2)}
                                            </span>
                                        </div>
                                        <Progress
                                            value={(curso.promedio / 20) * 100}
                                            className="h-2 bg-slate-100 dark:bg-slate-800"
                                        
                                        />
                                    </div>
                                ))}
                                {cursoStats.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No hay cursos registrados</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cursos" className="space-y-6">
                    {/* Promedio Final */}
                    {cursos.length > 0 && (
                        <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-100 dark:border-indigo-900 shadow-sm">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                        <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-100 mb-4">Promedio Ponderado del Ciclo</h3>
                                        <div className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter">
                                            {(cursos.reduce((sum, c) => sum + c.promedio, 0) / cursos.length).toFixed(2)}
                                        </div>
                                        <p className="text-sm text-indigo-600/60 dark:text-indigo-400/60 mt-2 font-medium">
                                            Basado en {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleDescargarBoleta}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
                                        size="lg"
                                    >
                                        <FileText className="h-5 w-5" />
                                        Descargar Boleta de Notas
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {cursos.map((curso) => (
                            <Card key={curso.id} className="border-none shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                                {curso.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">{curso.nombre}</CardTitle>
                                                <CardDescription className="font-mono text-md mt-1">COD: {curso.codigo}</CardDescription>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full text-sm font-bold border ${curso.promedio >= 10.5
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                            : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30"
                                            }`}>
                                            Promedio: {curso.promedio.toFixed(2)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    {/* Competencias */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-indigo-500" />
                                            Competencias
                                        </h4>
                                        {curso.competencias.length > 0 ? (
                                            <div className="grid gap-3">
                                                {curso.competencias.map((comp: any) => (
                                                    <div key={comp.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                                        <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-slate-800 dark:text-slate-200 text-md">{comp.nombre}</div>
                                                            {comp.descripcion && (
                                                                <div className="text-md text-slate-500 mt-1">{comp.descripcion}</div>
                                                            )}
                                                        </div>
                                                        <Badge variant="secondary" className="shrink-0">{comp.porcentaje}%</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No hay competencias asignadas</p>
                                        )}
                                    </div>

                                    {/* Evaluaciones */}
                                    <div>
                                        <h4 className="text-md font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                                            Evaluaciones
                                        </h4>
                                        {curso.evaluacionesAgrupadas && curso.evaluacionesAgrupadas.length > 0 ? (
                                            <div className="grid gap-4">
                                                {curso.evaluacionesAgrupadas.map((evaluacion: any) => (
                                                    <div key={evaluacion.nombre} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                                                            <span className="font-semibold text-md text-slate-700 dark:text-slate-300">{evaluacion.nombre}</span>
                                                            <span className={`text-md font-bold ${evaluacion.promedio >= 10.5 ? "text-emerald-600" : "text-rose-600"}`}>
                                                                Promedio: {evaluacion.promedio.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="p-0">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                                                                        <TableHead className="h-9 text-md">Competencia</TableHead>
                                                                        <TableHead className="h-9 text-md text-center">Nota</TableHead>
                                                                        <TableHead className="h-9 text-md text-center">Peso</TableHead>
                                                                        <TableHead className="h-9 text-md text-right">Fecha</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {evaluacion.evaluaciones.map((ev: any) => (
                                                                        <TableRow key={ev.id} className="hover:bg-slate-50/50 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                                                            <TableCell className="text-md py-2">{ev.tipo_evaluacion.split(' - ')[1] || ev.tipo_evaluacion}</TableCell>
                                                                            <TableCell className="text-center py-2">
                                                                                <span className={`font-bold text-md ${ev.nota >= 10.5 ? "text-emerald-600" : "text-rose-600"}`}>
                                                                                    {ev.nota}
                                                                                </span>
                                                                            </TableCell>
                                                                            <TableCell className="text-center text-md text-slate-500 py-2">{(ev.peso * 100).toFixed(0)}%</TableCell>
                                                                            <TableCell className="text-right text-md text-slate-500 py-2">
                                                                                {ev.fecha_evaluacion ? format(new Date(ev.fecha_evaluacion), "dd/MM/yyyy") : '-'}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No tienes evaluaciones registradas aún</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {cursos.length === 0 && (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No estás matriculado en ningún curso</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="asistencia" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">Calendario</CardTitle>
                                <CardDescription>Registro mensual de asistencias</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center p-6">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    modifiers={{ presente: selectedDates }}
                                    modifiersClassNames={{ presente: "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white" }}
                                    className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
                                    locale={es}
                                />
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="border-none shadow-sm h-full">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold">Detalle del Día</CardTitle>
                                    <CardDescription>
                                        {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "Selecciona una fecha"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedDate ? (
                                        selectedAsistencia ? (
                                            <div className="space-y-4">
                                                <div className={`p-4 rounded-xl border ${selectedAsistencia.presente
                                                    ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400"
                                                    : "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400"
                                                    }`}>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className={`w-2 h-2 rounded-full ${selectedAsistencia.presente ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                        <span className="font-bold text-lg">
                                                            {selectedAsistencia.presente ? "ASISTIÓ" : "FALTA"}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm opacity-80 pl-5">
                                                        Registrado el {format(new Date(selectedAsistencia.fecha), "HH:mm")}
                                                    </p>
                                                </div>

                                                {selectedAsistencia.justificacion && (
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <span className="text-md font-bold text-slate-500 uppercase tracking-wider block mb-2">Justificación</span>
                                                        <p className="text-slate-700 dark:text-slate-300 italic">
                                                            "{selectedAsistencia.justificacion}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                                <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
                                                <p>No hay registro para esta fecha</p>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400">
                                            <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                                            <p>Selecciona un día del calendario</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="pagos" className="space-y-6">
                    {planPago ? (
                        <div className="space-y-6">
                            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                                <CardHeader className="relative z-10">
                                    <CardTitle className="text-xl">Mi Plan de Pagos</CardTitle>
                                    <CardDescription className="text-slate-300">{planPago.nombre}</CardDescription>
                                </CardHeader>
                                <CardContent className="relative z-10 space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                        <div>
                                            <p className="text-md text-slate-400 uppercase tracking-wider mb-1">Ciclo</p>
                                            <p className="font-semibold text-lg">{planPago.ciclos_academicos?.nombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-md text-slate-400 uppercase tracking-wider mb-1">Total</p>
                                            <p className="font-semibold text-lg">S/ {planPago.total?.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-md text-slate-400 uppercase tracking-wider mb-1">Pagado</p>
                                            <p className="font-semibold text-lg text-emerald-400">S/ {planPago.pagado?.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-md text-slate-400 uppercase tracking-wider mb-1">Pendiente</p>
                                            <p className="font-semibold text-lg text-orange-400">S/ {planPago.restante?.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-md text-slate-300">
                                            <span>Progreso de pagos</span>
                                            <span>{((planPago.pagado / planPago.total) * 100).toFixed(1)}%</span>
                                        </div>
                                        <Progress value={(planPago.pagado / planPago.total) * 100} className="h-2 bg-white/10" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold">Cronograma de Cuotas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>N°</TableHead>
                                                <TableHead>Concepto</TableHead>
                                                <TableHead>Vencimiento</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuotas.map((cuota) => (
                                                <TableRow key={cuota.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium">#{cuota.numero_cuota}</TableCell>
                                                    <TableCell>{cuota.concepto}</TableCell>
                                                    <TableCell className="text-slate-500">
                                                        {format(new Date(cuota.fecha_vencimiento), "dd/MM/yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">S/ {cuota.monto.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`
                                                                ${cuota.estado === "pagado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                                                                ${cuota.estado === "pendiente" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                                                                ${cuota.estado === "vencido" ? "bg-rose-50 text-rose-700 border-rose-200" : ""}
                                                            `}
                                                        >
                                                            {cuota.estado.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <CreditCard className="h-16 w-16 text-slate-200 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sin Plan de Pagos</h3>
                            <p className="text-slate-500">No tienes un plan de pagos asignado actualmente</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="ranking" className="max-w-3xl mx-auto">
                    <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-8 text-center">
                            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-300" />
                            <CardTitle className="text-2xl font-bold">Cuadro de Mérito</CardTitle>
                            <CardDescription className="text-indigo-100">
                                Ranking basado en el promedio ponderado del salón
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {myPosition > 0 && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center gap-4">
                                    <span className="text-indigo-900 dark:text-indigo-100 font-medium">Tu posición actual:</span>
                                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">#{myPosition}</span>
                                </div>
                            )}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {ranking.map((estudiante, index) => (
                                    <div
                                        key={estudiante.id}
                                        className={`flex items-center justify-between p-6 transition-colors ${estudiante.isMe ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`
                                                w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm
                                                ${index === 0 ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                                                    index === 1 ? "bg-slate-100 text-slate-700 border border-slate-200" :
                                                        index === 2 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                                            "bg-white text-slate-500 border border-slate-100"}
                                            `}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                                    {estudiante.nombre}
                                                    {estudiante.isMe && (
                                                        <Badge variant="secondary" className="text-md bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Tú</Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500">Estudiante</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{estudiante.promedio.toFixed(2)}</div>
                                            <div className="text-md text-slate-400 font-medium uppercase tracking-wider">Promedio</div>
                                        </div>
                                    </div>
                                ))}
                                {ranking.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        No hay datos de ranking disponibles
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default StudentDashboard;