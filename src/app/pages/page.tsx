"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/servicios/base-datos/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { GraduationCap, BookOpen, Calendar as CalendarIcon, Trophy, BarChart3, LogOut, CreditCard } from "lucide-react";
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

const COLORS = {
  aprobado: "hsl(var(--chart-2))",
  desaprobado: "hsl(var(--chart-1))",
  presente: "hsl(var(--chart-3))",
  ausente: "hsl(var(--chart-4))",
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { signOut, user } = useAuth();
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
    if (user) {
      loadStudentData();
    }
  }, [user]);

  const loadStudentData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      
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
    if (matriculaIds.length === 0) return;

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

      
      const dates = dataTyped.filter(a => a.presente).map(a => new Date(a.fecha));
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
      const asistenciaEnFecha = asistencias.find(
        a => format(new Date(a.fecha), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
      setSelectedAsistencia(asistenciaEnFecha || null);
    } else {
      setSelectedAsistencia(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 to-green-50/30 dark:from-background dark:via-blue-950/20 dark:to-green-950/20">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Portal del Estudiante
              </h1>
              <p className="text-sm text-muted-foreground">
                {studentInfo?.nombres} {studentInfo?.apellidos}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-2 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="cursos" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Cursos</span>
            </TabsTrigger>
            <TabsTrigger value="asistencia" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Asistencia</span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard">
              <div className="grid gap-6">
                {/* Info del Salón */}
                <Card>
                  <CardHeader>
                    <CardTitle>Mi Salón</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salon ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Salón:</span>
                          <span>{salon.nombre || `${salon.nivel} - ${salon.grado} ${salon.seccion}`}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Profesor:</span>
                          <span>
                            {salon.profesores ?
                              `${salon.profesores.nombres} ${salon.profesores.apellidos}` :
                              "No asignado"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Ciclo Académico:</span>
                          <span>{salon.ciclos_academicos?.nombre || "No asignado"}</span>
                        </div>
                        {salon.ciclos_academicos && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Periodo:</span>
                            <span>
                              {format(new Date(salon.ciclos_academicos.fecha_inicio), "dd/MM/yyyy")} - {" "}
                              {format(new Date(salon.ciclos_academicos.fecha_fin), "dd/MM/yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No estás asignado a ningún salón</p>
                    )}
                  </CardContent>
                </Card>

                {/* Gráficos de Rendimiento */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rendimiento General</CardTitle>
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
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {rendimientoGeneral.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.name === "Aprobados" ? COLORS.aprobado : COLORS.desaprobado}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground">No hay datos disponibles</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Asistencia</CardTitle>
                      <CardDescription>Registro de tu asistencia</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {asistenciaData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={asistenciaData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.name}: ${entry.value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {asistenciaData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.name === "Presente" ? COLORS.presente : COLORS.ausente}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground">No hay datos disponibles</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Rendimiento por Curso */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rendimiento por Curso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cursoStats.map((curso, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{curso.nombre}</span>
                            <Badge variant={curso.promedio >= 10.5 ? "default" : "destructive"}>
                              {curso.promedio.toFixed(2)}
                            </Badge>
                          </div>
                          <Progress value={(curso.promedio / 20) * 100} />
                        </div>
                      ))}
                      {cursoStats.length === 0 && (
                        <p className="text-center text-muted-foreground">No hay cursos registrados</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cursos">
              <div className="grid gap-4">
                {/* Promedio Final del Ciclo Académico */}
                {cursos.length > 0 && (
                  <Card className="border-2 border-primary shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                      <CardTitle className="text-2xl text-center">Promedio Final del Ciclo Académico</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {(cursos.reduce((sum, c) => sum + c.promedio, 0) / cursos.length).toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Promedio de {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cursos.map((curso) => (
                  <Card key={curso.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{curso.nombre}</CardTitle>
                        <Badge variant={curso.promedio >= 10.5 ? "default" : "destructive"}>
                          Promedio General: {curso.promedio.toFixed(2)}
                        </Badge>
                      </div>
                      <CardDescription>Código: {curso.codigo}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Competencias */}
                      <div>
                        <h4 className="font-semibold mb-3">Competencias</h4>
                        {curso.competencias.length > 0 ? (
                          <div className="space-y-2">
                            {curso.competencias.map((comp: any) => (
                              <div key={comp.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex-1">
                                  <div className="font-medium">{comp.nombre}</div>
                                  {comp.descripcion && (
                                    <div className="text-sm text-muted-foreground">{comp.descripcion}</div>
                                  )}
                                </div>
                                <Badge variant="outline">{comp.porcentaje}%</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No hay competencias asignadas</p>
                        )}
                      </div>

                      {/* Evaluaciones */}
                      <div>
                        <h4 className="font-semibold mb-3">Mis Evaluaciones</h4>
                        {curso.evaluacionesAgrupadas && curso.evaluacionesAgrupadas.length > 0 ? (
                          <div className="space-y-4">
                            {curso.evaluacionesAgrupadas.map((evaluacion: any) => (
                              <Card key={evaluacion.nombre} className="border-2">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{evaluacion.nombre}</CardTitle>
                                    <Badge variant={evaluacion.promedio >= 10.5 ? "default" : "destructive"} className="text-base">
                                      {evaluacion.promedio.toFixed(2)}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Competencia</TableHead>
                                        <TableHead>Nota</TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Fecha</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {evaluacion.evaluaciones.map((ev: any) => (
                                        <TableRow key={ev.id}>
                                          <TableCell>{ev.tipo_evaluacion.split(' - ')[1] || ev.tipo_evaluacion}</TableCell>
                                          <TableCell>
                                            <span className={`font-bold ${ev.nota >= 10.5 ? "text-green-600" : "text-red-600"}`}>
                                              {ev.nota}
                                            </span>
                                          </TableCell>
                                          <TableCell>{(ev.peso * 100).toFixed(0)}%</TableCell>
                                          <TableCell>
                                            {ev.fecha_evaluacion ? format(new Date(ev.fecha_evaluacion), "dd/MM/yyyy") : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No tienes evaluaciones registradas aún</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {cursos.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <p className="text-muted-foreground">No estás matriculado en ningún curso</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="asistencia">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Calendario de Asistencia</CardTitle>
                    <CardDescription>
                      Los días marcados indican tu asistencia a clases. Selecciona una fecha para ver el detalle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      modifiers={{ presente: selectedDates }}
                      modifiersClassNames={{ presente: "bg-primary text-primary-foreground" }}
                      className="pointer-events-auto rounded-md border"
                      locale={es}
                    />
                  </CardContent>
                </Card>

                {selectedDate && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalle de Asistencia</CardTitle>
                      <CardDescription>
                        {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedAsistencia ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="font-medium">Estado:</span>
                            <Badge variant={selectedAsistencia.presente ? "default" : "destructive"}>
                              {selectedAsistencia.presente ? "Presente" : "Ausente"}
                            </Badge>
                          </div>
                          {selectedAsistencia.justificacion && (
                            <div className="p-3 bg-muted rounded-lg">
                              <span className="font-medium">Justificación:</span>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {selectedAsistencia.justificacion}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No hay registro de asistencia para esta fecha
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pagos">
              <div className="grid gap-4">
                {planPago ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Mi Plan de Pagos</CardTitle>
                        <CardDescription>{planPago.nombre}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Ciclo Académico</p>
                            <p className="font-semibold">{planPago.ciclos_academicos?.nombre}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Nivel</p>
                            <p className="font-semibold">{planPago.nivel}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-semibold">S/ {planPago.total?.toFixed(2)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Pagado</p>
                            <p className="font-semibold text-green-600">S/ {planPago.pagado?.toFixed(2)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Restante</p>
                            <p className="font-semibold text-orange-600">S/ {planPago.restante?.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Progress value={(planPago.pagado / planPago.total) * 100} className="h-3" />
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            {((planPago.pagado / planPago.total) * 100).toFixed(1)}% pagado
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Detalle de Cuotas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuota</TableHead>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Vencimiento</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cuotas.map((cuota) => (
                              <TableRow key={cuota.id}>
                                <TableCell>#{cuota.numero_cuota}</TableCell>
                                <TableCell>{cuota.concepto}</TableCell>
                                <TableCell>S/ {cuota.monto.toFixed(2)}</TableCell>
                                <TableCell>{format(new Date(cuota.fecha_vencimiento), "dd/MM/yyyy")}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      cuota.estado === "pagado"
                                        ? "default"
                                        : cuota.estado === "pendiente"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {cuota.estado}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No tienes un plan de pagos asignado</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle>Orden de Mérito</CardTitle>
                  <CardDescription>
                    Ranking basado en el promedio general de todos los cursos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myPosition > 0 && (
                    <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-center text-lg font-semibold">
                        Tu posición: <span className="text-2xl text-primary">#{myPosition}</span>
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {ranking.map((estudiante, index) => (
                      <div
                        key={estudiante.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${estudiante.isMe ? "bg-primary/5 border-primary" : "bg-muted/30"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">{estudiante.nombre}</div>
                            {estudiante.isMe && (
                              <Badge variant="default" className="mt-1">Tú</Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg">
                          {estudiante.promedio.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    {ranking.length === 0 && (
                      <p className="text-center text-muted-foreground py-10">
                        No hay datos de ranking disponibles
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;