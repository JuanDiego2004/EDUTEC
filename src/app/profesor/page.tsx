"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import { useRouter } from "next/navigation";
import { supabase } from "@/servicios/base-datos/supabase";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import {
    LogOut, School, ClipboardCheck, BarChart3, FileText,
    Menu, X, Search, Bell, ChevronRight, Users, BookOpen,
    Calendar, GraduationCap, LayoutDashboard
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentes/ui/avatar";


import { TabSalones } from "@/funcionalidades/profesores/componentes/TabSalones";
import { TabAsistencia } from "@/funcionalidades/profesores/componentes/TabAsistencia";
import { TabEvaluaciones } from "@/funcionalidades/profesores/componentes/TabEvaluaciones";
import { TabEstadisticas } from "@/funcionalidades/profesores/componentes/TabEstadisticas";
import { ModalVerEstudiantes } from "@/funcionalidades/profesores/componentes/ModalVerEstudiantes";
import { ModalVerNotas } from "@/funcionalidades/profesores/componentes/ModalVerNotas";

export default function ProfesorDashboard() {
    const { user, signOut, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profesorId, setProfesorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    
    const [salones, setSalones] = useState<any[]>([]);
    const [loadingSalones, setLoadingSalones] = useState(false);

    
    const [selectedSalonAsistencia, setSelectedSalonAsistencia] = useState("");
    const [fechaAsistencia, setFechaAsistencia] = useState<Date>(new Date());
    const [estudiantesAsistencia, setEstudiantesAsistencia] = useState<any[]>([]);
    const [asistencias, setAsistencias] = useState<Record<string, string>>({});

    
    const [selectedSalonEvaluaciones, setSelectedSalonEvaluaciones] = useState("");
    const [selectedCurso, setSelectedCurso] = useState("");
    const [salonCursos, setSalonCursos] = useState<any[]>([]);
    const [competencias, setCompetencias] = useState<any[]>([]);
    const [estudiantesEvaluaciones, setEstudiantesEvaluaciones] = useState<any[]>([]);
    const [evaluacionesGuardadas, setEvaluacionesGuardadas] = useState<any[]>([]);
    const [notas, setNotas] = useState<Record<string, Record<string, string>>>({});
    const [nombreEvaluacion, setNombreEvaluacion] = useState("");
    const [savingEvaluacion, setSavingEvaluacion] = useState(false);

    
    const [selectedSalonEstadisticas, setSelectedSalonEstadisticas] = useState("");
    const [statsViewType, setStatsViewType] = useState<"general" | "curso">("general");
    const [selectedCursoEstadisticas, setSelectedCursoEstadisticas] = useState("");
    const [estadisticasData, setEstadisticasData] = useState<any>(null);
    const [salonCursosEstadisticas, setSalonCursosEstadisticas] = useState<any[]>([]);

    
    const [modalEstudiantesOpen, setModalEstudiantesOpen] = useState(false);
    const [modalNotasOpen, setModalNotasOpen] = useState(false);
    const [selectedSalonModal, setSelectedSalonModal] = useState<any>(null);
    const [estudiantesDelSalonModal, setEstudiantesDelSalonModal] = useState<any[]>([]);
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null);
    const [editandoEvaluacion, setEditandoEvaluacion] = useState<string | null>(null);

    
    useEffect(() => {
        const loadProfesorData = async () => {
            if (!user?.id) {
                router.push("/auth");
                return;
            }

            try {
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("profesor_id")
                    .eq("user_id", user.id)
                    .single();

                if (error) throw error;

                if (!(profile as any)?.profesor_id) {
                    toast.error("No se encontró el perfil de profesor");
                    router.push("/auth");
                    return;
                }

                setProfesorId((profile as any).profesor_id as string);
                await loadSalones((profile as any).profesor_id as string);
            } catch (error) {
                console.error("Error loading profesor data:", error);
                toast.error("Error al cargar datos del profesor");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            loadProfesorData();
        }
    }, [user, authLoading, router]);

    
    useEffect(() => {
        if (selectedSalonEstadisticas && (statsViewType === "general" || (statsViewType === "curso" && selectedCursoEstadisticas))) {
            loadEstadisticas();
        }
    }, [selectedSalonEstadisticas, statsViewType, selectedCursoEstadisticas]);

    
    useEffect(() => {
        if (selectedSalonEstadisticas && statsViewType === "curso") {
            loadCursosSalonEstadisticas();
        }
    }, [selectedSalonEstadisticas, statsViewType]);

    
    const loadSalones = async (profId: string) => {
        setLoadingSalones(true);
        try {
            const { data: salonesData, error } = await supabase
                .from("salones")
                .select("*")
                .eq("profesor_id", profId)
                .eq("activo", true);

            if (error) throw error;

            const salonesConEstudiantes = await Promise.all(
                ((salonesData as any[]) || []).map(async (salon) => {
                    const { count } = await supabase
                        .from("estudiantes_salones")
                        .select("*", { count: "exact", head: true })
                        .eq("salon_id", (salon as any).id)
                        .eq("activo", true);

                    return {
                        ...(salon as any),
                        estudiantes_count: count || 0,
                    };
                })
            );

            setSalones(salonesConEstudiantes);
        } catch (error) {
            console.error("Error loading salones:", error);
            toast.error("No se pudieron cargar los salones");
        } finally {
            setLoadingSalones(false);
        }
    };

    
    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
    };

    const handleVerEstudiantes = async (salon: any) => {
        setSelectedSalonModal(salon);

        try {
            const { data, error } = await supabase
                .from("estudiantes_salones")
                .select("estudiantes(id, dni, nombres, apellidos)")
                .eq("salon_id", salon.id);

            if (error) throw error;
            setEstudiantesDelSalonModal((data as any[])?.map((es: any) => es.estudiantes) || []);
            setModalEstudiantesOpen(true);
        } catch (error) {
            console.error("Error loading estudiantes:", error);
            toast.error("Error al cargar estudiantes");
        }
    };

    const handleSelectSalonAsistencia = async (salonId: string) => {
        setSelectedSalonAsistencia(salonId);
        if (!salonId) {
            setEstudiantesAsistencia([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("estudiantes_salones")
                .select("estudiantes(id, dni, nombres, apellidos)")
                .eq("salon_id", salonId);

            if (error) throw error;
            setEstudiantesAsistencia((data as any[])?.map((es: any) => es.estudiantes) || []);
        } catch (error) {
            console.error("Error loading estudiantes:", error);
        }
    };

    const handleGuardarAsistencia = async () => {
        if (!selectedSalonAsistencia || Object.keys(asistencias).length === 0) {
            toast.error("Debe marcar asistencias antes de guardar");
            return;
        }

        try {
            
            const fechaPeru = new Date(fechaAsistencia.getTime() - (fechaAsistencia.getTimezoneOffset() * 60000));
            const fechaFormateada = fechaPeru.toISOString().split("T")[0];

            
            const { data: matriculas, error: matriculasError } = await supabase
                .from("matriculas")
                .select("id, estudiante_id")
                .in("estudiante_id", Object.keys(asistencias))
                .eq("estado", "activa");

            if (matriculasError) throw matriculasError;

            const asistenciasToInsert = Object.entries(asistencias)
                .filter(([_, estado]) => estado !== "")
                .map(([estudianteId, estado]) => {
                    const matricula = matriculas?.find((m: any) => m.estudiante_id === estudianteId) as any;
                    return {
                        matricula_id: matricula?.id,
                        fecha: fechaFormateada,
                        presente: estado === "PRESENTE",
                        justificacion: estado === "TARDE" ? "Llegó tarde" : estado === "FALTA" ? "Falta sin justificar" : null,
                    };
                })
                .filter((a) => a.matricula_id); 

            if (asistenciasToInsert.length === 0) {
                toast.error("No hay asistencias válidas para guardar");
                return;
            }

            
            const matriculaIds = asistenciasToInsert.map(a => a.matricula_id);
            const { data: asistenciasExistentes } = await supabase
                .from("asistencias")
                .select("id, matricula_id")
                .in("matricula_id", matriculaIds)
                .eq("fecha", fechaFormateada);

            
            const asistenciasParaInsertar: any[] = [];
            const asistenciasParaActualizar: any[] = [];

            asistenciasToInsert.forEach(asistencia => {
                const existente = asistenciasExistentes?.find((ae: any) => ae.matricula_id === asistencia.matricula_id) as any;
                if (existente) {
                    asistenciasParaActualizar.push({ id: existente.id, ...asistencia });
                } else {
                    asistenciasParaInsertar.push(asistencia);
                }
            });

            
            if (asistenciasParaInsertar.length > 0) {
                const { error: insertError } = await supabaseFailover.insert("asistencias", asistenciasParaInsertar);
                if (insertError) throw insertError;
            }

            
            for (const asistencia of asistenciasParaActualizar) {
                const { id, ...datos } = asistencia;
                const { error: updateError } = await supabaseFailover.update("asistencias", id, datos);
                if (updateError) throw updateError;
            }

            
            if (user?.id) {
                try {
                    const logResponse = await fetch("/api/module-logs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            idUsuario: user.id,
                            correoUsuario: user.email || "profesor@edutec.com",
                            rolUsuario: "profesor",
                            tipoActividad: "crear",
                            modulo: "Asistencias",
                            descripcion: `Registró asistencia para ${asistenciasToInsert.length} estudiantes (${asistenciasParaInsertar.length} nuevas, ${asistenciasParaActualizar.length} actualizadas)`,
                            tipoEntidad: "Asistencia",
                            metadata: {
                                salon_id: selectedSalonAsistencia,
                                fecha: fechaFormateada,
                                cantidad_registros: asistenciasToInsert.length,
                                nuevas: asistenciasParaInsertar.length,
                                actualizadas: asistenciasParaActualizar.length,
                            },
                        }),
                    });

                    if (!logResponse.ok) {
                        console.error("Error al registrar log en MongoDB:", await logResponse.text());
                    }
                } catch (logError) {
                    console.error("Error al registrar log:", logError);
                }
            }

            const mensaje = asistenciasParaActualizar.length > 0
                ? `Asistencia guardada: ${asistenciasParaInsertar.length} nuevas, ${asistenciasParaActualizar.length} actualizadas`
                : "Asistencia guardada exitosamente";

            toast.success(mensaje);

            
            setAsistencias({});
        } catch (error: any) {
            console.error("Error guardando asistencia:", error);
            toast.error(error.message || "Error al guardar asistencia");
        }
    };

    const handleSelectSalonEvaluaciones = async (salonId: string) => {
        setSelectedSalonEvaluaciones(salonId);
        setSelectedCurso("");
        setSalonCursos([]);
        setCompetencias([]);
        setEstudiantesEvaluaciones([]);
        setEvaluacionesGuardadas([]); 

        if (!salonId) return;

        try {
            const { data, error } = await supabase
                .from("salon_cursos")
                .select("id, cursos(id, codigo, nombre)")
                .eq("salon_id", salonId)
                .eq("activo", true);

            if (error) throw error;
            setSalonCursos((data as any[]) || []);

            const { data: estudiantes } = await supabase
                .from("estudiantes_salones")
                .select("estudiantes(id, dni, nombres, apellidos)")
                .eq("salon_id", salonId)
                .eq("activo", true);

            setEstudiantesEvaluaciones((estudiantes as any[])?.map((es: any) => es.estudiantes) || []);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar cursos del salón");
        }
    };

    const handleSelectCursoEvaluaciones = async (salonCursoId: string) => {
        setSelectedCurso(salonCursoId);
        if (!salonCursoId) {
            setCompetencias([]);
            setEvaluacionesGuardadas([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("competencias")
                .select("*")
                .eq("salon_curso_id", salonCursoId)
                .order("created_at");

            if (error) throw error;
            setCompetencias((data as any[]) || []);

            
            await loadEvaluacionesExistentes(salonCursoId);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar datos del curso");
        }
    };

    const handleVerNotasEstudiante = async (estudianteId: string) => {
        try {
            
            const estudiante = estudiantesEvaluaciones.find(e => e.id === estudianteId);
            if (!estudiante) {
                console.error("Estudiante no encontrado en la lista local");
                return;
            }

            
            const { data: salonCursoData } = await supabase
                .from("salon_cursos")
                .select("curso_id")
                .eq("id", selectedCurso)
                .single();

            const cursoId = (salonCursoData as any)?.curso_id;

            
            let matriculaId = null;

            if (cursoId) {
                const { data: matricula } = await supabase
                    .from("matriculas")
                    .select("id")
                    .eq("estudiante_id", estudianteId)
                    
                    .eq("estado", "activa")
                    .limit(1)
                    .single();
                matriculaId = (matricula as any)?.id;
            }

            
            if (!matriculaId) {
                const { data: matriculaFallback } = await supabase
                    .from("matriculas")
                    .select("id")
                    .eq("estudiante_id", estudianteId)
                    .eq("estado", "activa")
                    .limit(1)
                    .single();
                matriculaId = (matriculaFallback as any)?.id;
            }

            if (!matriculaId) {
                toast.error("No se encontró matrícula activa para este estudiante");
                return;
            }

            
            const { data: evaluaciones, error } = await supabase
                .from("evaluaciones")
                .select("*")
                .eq("matricula_id", matriculaId)
                .order("fecha_evaluacion", { ascending: false });

            if (error) throw error;

            
            const estudianteConNotas = {
                ...estudiante,
                evaluaciones: (evaluaciones as any[])?.map((ev: any) => ({
                    id: ev.id,
                    tipo_evaluacion: ev.tipo_evaluacion,
                    nota: ev.nota,
                    peso: ev.peso,
                    fecha_evaluacion: ev.fecha_evaluacion
                })) || [],
            };

            setEstudianteSeleccionado(estudianteConNotas);
            
            setTimeout(() => setModalNotasOpen(true), 50);

        } catch (error) {
            console.error("Error loading evaluaciones:", error);
            toast.error("Error al cargar evaluaciones");
        }
    };

    const loadEvaluacionesExistentes = async (salonCursoId: string) => {
        if (!selectedSalonEvaluaciones) return;

        try {
            
            const { data: salonCurso } = await supabase
                .from("salon_cursos")
                .select("curso_id")
                .eq("id", salonCursoId)
                .single();

            if (!salonCurso) return;

            
            const { data: estudiantesSalon } = await supabase
                .from("estudiantes_salones")
                .select("estudiante_id")
                .eq("salon_id", selectedSalonEvaluaciones)
                .eq("activo", true);

            if (!estudiantesSalon || estudiantesSalon.length === 0) return;

            const estudiantesIds = (estudiantesSalon as any[]).map((es: any) => es.estudiante_id);

            
            const { data: matriculas } = await supabase
                .from("matriculas")
                .select(`
                    id,
                    estudiante_id,
                    estudiantes(nombres, apellidos, dni)
                `)
                .in("estudiante_id", estudiantesIds)
                
                .eq("estado", "activa");

            if (!matriculas || matriculas.length === 0) return;

            
            const { data: evaluaciones } = await supabase
                .from("evaluaciones")
                .select("*")
                .in("matricula_id", (matriculas as any[]).map((m: any) => m.id));

            
            const evaluacionesConEstudiante = ((evaluaciones as any[]) || []).map((ev: any) => {
                const matricula = (matriculas as any[]).find((m: any) => m.id === ev.matricula_id);
                return {
                    ...ev,
                    estudiante: matricula?.estudiantes,
                };
            });

            setEvaluacionesGuardadas(evaluacionesConEstudiante);
        } catch (error) {
            console.error("Error cargando evaluaciones:", error);
        }
    };

    const handleGuardarEvaluacion = async () => {
        if (!selectedSalonEvaluaciones || !selectedCurso) { 
            toast.error("Selecciona un salón y curso");
            return;
        }

        if (!nombreEvaluacion.trim()) {
            toast.error("Debes ingresar un nombre para la evaluación");
            return;
        }

        setSavingEvaluacion(true);
        try {
            console.log(" [Evaluaciones] Iniciando guardado...");
            console.log(" selectedSalonEvaluaciones:", selectedSalonEvaluaciones);
            console.log(" selectedCurso:", selectedCurso);
            console.log(" nombreEvaluacion:", nombreEvaluacion);
            console.log(" notas:", notas);
            console.log(" Object.keys(notas):", Object.keys(notas));

            
            const fechaPeru = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
            const fechaFormateada = fechaPeru.toISOString().split("T")[0];
            console.log(" fechaFormateada:", fechaFormateada);

            
            const { data: salonCursoData } = await supabase
                .from("salon_cursos")
                .select("curso_id")
                .eq("id", selectedCurso)
                .single();

            const cursoId = (salonCursoData as any)?.curso_id;
            console.log(" cursoId obtenido:", cursoId);

            if (!cursoId) {
                toast.error("No se encontró el curso");
                return;
            }

            
            
            
            
            console.log(" Buscando matrículas con:");
            console.log("  - estudiante_id IN:", Object.keys(notas));
            console.log("  - estado: activa");

            const { data: matriculas, error: matriculasError } = await supabase
                .from("matriculas")
                .select("id, estudiante_id, curso_id, estado, periodo_academico")
                .in("estudiante_id", Object.keys(notas))
                .eq("estado", "activa");

            if (matriculasError) {
                console.error("Error buscando matrículas:", matriculasError);
                throw matriculasError;
            }
            console.log(" Matrículas encontradas:", matriculas);

            const evaluacionesToInsert: any[] = [];

            Object.entries(notas).forEach(([estudianteId, competenciasNotas]) => {
                console.log(`Procesando estudiante ${estudianteId}:`, competenciasNotas);
                const matricula = matriculas?.find((m: any) => m.estudiante_id === estudianteId) as any;

                if (!matricula) {
                    console.warn(` No se encontró matrícula para estudiante ${estudianteId}`);
                    return;
                }
                console.log(` Matrícula encontrada para ${estudianteId}:`, matricula.id);

                Object.entries(competenciasNotas).forEach(([competenciaId, nota]) => {
                    console.log(`  Competencia ${competenciaId}, nota: "${nota}"`);
                    if (nota !== "") {
                        const competencia = competencias.find((c: any) => c.id === competenciaId) as any;
                        console.log(`   Agregando evaluación:`, {
                            matricula_id: matricula.id,
                            tipo_evaluacion: `${nombreEvaluacion} - ${competencia?.nombre || "Evaluación"}`,
                            nota: parseFloat(nota),
                            peso: competencia ? competencia.porcentaje / 100 : 1,
                        });
                        evaluacionesToInsert.push({
                            matricula_id: matricula.id,
                            tipo_evaluacion: `${nombreEvaluacion} - ${competencia?.nombre || "Evaluación"}`,
                            nota: parseFloat(nota),
                            peso: competencia ? competencia.porcentaje / 100 : 1,
                            fecha_evaluacion: fechaFormateada,
                        });
                    }
                });
            });

            console.log("📦 Total de evaluaciones a insertar:", evaluacionesToInsert.length);
            console.log("📦 Evaluaciones:", evaluacionesToInsert);

            if (evaluacionesToInsert.length === 0) {
                console.error("No hay evaluaciones para guardar");
                toast.error("No hay evaluaciones para guardar");
                return;
            }

            
            const { error } = await supabaseFailover.insert("evaluaciones", evaluacionesToInsert);

            if (error) throw error;

            
            if (user?.id) {
                try {
                    const logResponse = await fetch("/api/module-logs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            idUsuario: user.id,
                            correoUsuario: user.email || "profesor@edutec.com",
                            rolUsuario: "profesor",
                            tipoActividad: "crear",
                            modulo: "Evaluaciones",
                            descripcion: `Registró evaluación '${nombreEvaluacion}' para ${evaluacionesToInsert.length} estudiantes`,
                            tipoEntidad: "Evaluacion",
                            metadata: {
                                salon_id: selectedSalonEvaluaciones, 
                                curso_eval_id: selectedCurso, 
                                nombre_evaluacion: nombreEvaluacion,
                                cantidad_evaluaciones: evaluacionesToInsert.length,
                            },
                        }),
                    });

                    if (!logResponse.ok) {
                        console.error("Error al registrar log en MongoDB:", await logResponse.text());
                    }
                } catch (logError) {
                    console.error("Error al registrar log:", logError);
                }
            }

            toast.success("Evaluaciones guardadas correctamente");

            await loadEvaluacionesExistentes(selectedCurso); 

            
            setNombreEvaluacion("");
            const notasInit: Record<string, Record<string, string>> = {};
            estudiantesEvaluaciones.forEach((est: any) => { 
                notasInit[est.id] = {};
                competencias.forEach((comp: any) => { 
                    notasInit[est.id][comp.id] = "";
                });
            });
            setNotas(notasInit);
        } catch (error: any) {
            console.error("Error guardando evaluaciones:", error);
            toast.error(error.message || "Error al guardar evaluaciones");
        } finally {
            setSavingEvaluacion(false);
        }
    };



    const loadCursosSalonEstadisticas = async () => {
        if (!selectedSalonEstadisticas) return;

        try {
            const { data, error } = await supabase
                .from("salon_cursos")
                .select("id, curso_id, cursos(codigo, nombre)")
                .eq("salon_id", selectedSalonEstadisticas)
                .eq("activo", true);

            if (error) throw error;
            setSalonCursosEstadisticas((data as any[]) || []);
        } catch (error) {
            console.error("Error cargando cursos:", error);
        }
    };

    const loadEstadisticas = async () => {
        if (!selectedSalonEstadisticas) return;

        try {
            if (statsViewType === "general") {
                
                const { data: salonCursosData } = await supabase
                    .from("salon_cursos")
                    .select("curso_id, cursos(nombre)")
                    .eq("salon_id", selectedSalonEstadisticas)
                    .eq("activo", true);

                if (!salonCursosData) return;

                const cursosIds = (salonCursosData as any[]).map((sc: any) => sc.curso_id);

                
                const { data: matriculas } = await supabase
                    .from("matriculas")
                    .select(`
                        id,
                        curso_id,
                        cursos(nombre),
                        estado_academico(promedio)
                    `)
                    .in("curso_id", cursosIds)
                    .eq("estado", "activa");

                
                const aprobados = (matriculas as any[])?.filter((m: any) => Number((m.estado_academico as any)?.[0]?.promedio || 0) >= 10.5).length || 0;
                const reprobados = (matriculas as any[])?.filter((m: any) => Number((m.estado_academico as any)?.[0]?.promedio || 0) < 10.5).length || 0;

                
                const { data: asistencias } = await supabase
                    .from("asistencias")
                    .select(`
                        presente,
                        matriculas!inner(id, curso_id)
                    `)
                    .in("matriculas.curso_id", cursosIds);

                const presente = (asistencias as any[])?.filter((a: any) => a.presente === true).length || 0;
                const ausente = (asistencias as any[])?.filter((a: any) => a.presente === false).length || 0;

                setEstadisticasData({
                    notasData: [
                        { name: "Aprobados", value: aprobados, color: "#10b981" },
                        { name: "Reprobados", value: reprobados, color: "#ef4444" },
                    ],
                    asistenciasData: [
                        { name: "Presente", value: presente, color: "#10b981" },
                        { name: "Ausente", value: ausente, color: "#ef4444" },
                    ],
                });
            } else {
                
                if (!selectedCursoEstadisticas) return;

                const { data: matriculas } = await supabase
                    .from("matriculas")
                    .select(`
                        id,
                        estudiantes(id),
                        estado_academico(promedio)
                    `)
                    .eq("curso_id", selectedCursoEstadisticas)
                    .eq("estado", "activa");

                const aprobados = (matriculas as any[])?.filter((m: any) => Number((m.estado_academico as any)?.[0]?.promedio || 0) >= 10.5).length || 0;
                const reprobados = (matriculas as any[])?.filter((m: any) => Number((m.estado_academico as any)?.[0]?.promedio || 0) < 10.5).length || 0;

                const { data: asistencias } = await supabase
                    .from("asistencias")
                    .select(`
                        presente,
                        matriculas!inner(id, curso_id)
                    `)
                    .eq("matriculas.curso_id", selectedCursoEstadisticas);

                const presente = (asistencias as any[])?.filter((a: any) => a.presente === true).length || 0;
                const ausente = (asistencias as any[])?.filter((a: any) => a.presente === false).length || 0;

                setEstadisticasData({
                    notasData: [
                        { name: "Aprobados", value: aprobados, color: "#10b981" },
                        { name: "Reprobados", value: reprobados, color: "#ef4444" },
                    ],
                    asistenciasData: [
                        { name: "Presente", value: presente, color: "#10b981" },
                        { name: "Ausente", value: ausente, color: "#ef4444" },
                    ],
                });
            }
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
        }
    };

    const handleEditarEvaluacion = async (id: string, nota: number) => {
        try {
            const { error } = await (supabase
                .from("evaluaciones") as any)
                .update({ nota })
                .eq("id", id);

            if (error) throw error;
            toast.success("Nota actualizada");
            setEditandoEvaluacion(null);
            
            if (estudianteSeleccionado) {
                handleVerNotasEstudiante(estudianteSeleccionado.id);
            }
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar nota");
        }
    };

    const handleEliminarEvaluacion = async (id: string) => {
        if (!confirm("¿Está seguro de eliminar esta evaluación?")) return;

        try {
            const { error } = await supabase
                .from("evaluaciones")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Evaluación eliminada");
            
            if (estudianteSeleccionado) {
                handleVerNotasEstudiante(estudianteSeleccionado.id);
            }
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar evaluación");
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!profesorId) {
        return null;
    }

    const getInitials = (name: string) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'PR';
    };

    const navigationItems = [
        { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", color: "from-blue-500 to-cyan-500" },
        { id: "salones", icon: School, label: "Mis Salones", color: "from-violet-500 to-purple-500" },
        { id: "asistencia", icon: ClipboardCheck, label: "Asistencias", color: "from-green-500 to-emerald-500" },
        { id: "evaluaciones", icon: FileText, label: "Evaluaciones", color: "from-orange-500 to-red-500" },
        { id: "estadisticas", icon: BarChart3, label: "Estadísticas", color: "from-pink-500 to-rose-500" },
    ];

    
    const DashboardSummary = () => {
        const totalEstudiantes = salones.reduce((acc, salon) => acc + (salon.estudiantes_count || 0), 0);
        const totalSalones = salones.length;

        return (
            <div className="space-y-6">
                {/* Grid de Tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Estudiantes */}
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-0 shadow-xl text-white overflow-hidden relative group">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Users className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-indigo-100 text-sm font-medium">Total Estudiantes</p>
                                    <h3 className="text-3xl font-bold">{totalEstudiantes}</h3>
                                </div>
                            </div>
                            <p className="text-indigo-100 text-sm">Alumnos matriculados en sus cursos</p>
                        </CardContent>
                    </Card>

                    {/* Card Salones */}
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-lg hover:shadow-xl transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-purple-500/20">
                                    <School className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Mis Salones</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{totalSalones}</h3>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Salones asignados activos</p>
                        </CardContent>
                    </Card>

                    {/* Card Accesos Rápidos */}
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-lg hover:shadow-xl transition-all">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Accesos Rápidos</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="h-auto py-3 flex flex-col gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                    onClick={() => setActiveTab("asistencia")}
                                >
                                    <ClipboardCheck className="h-5 w-5" />
                                    <span className="text-xs">Asistencia</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-3 flex flex-col gap-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                                    onClick={() => setActiveTab("evaluaciones")}
                                >
                                    <FileText className="h-5 w-5" />
                                    <span className="text-xs">Notas</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Salones Recientes */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Mis Salones</h2>
                    <TabSalones
                        salones={salones}
                        loading={loadingSalones}
                        onVerEstudiantes={handleVerEstudiantes}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
            {/* Header Superior */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo y Menú Mobile */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                                    <GraduationCap className="h-6 w-6 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        EDU CLASS
                                    </h1>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Panel del Profesor</p>
                                </div>
                            </div>
                        </div>

                        {/* Acciones del Header */}
                        <div className="flex items-center gap-3">

                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border-2 border-slate-200 dark:border-slate-700">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                                        {getInitials(user?.user_metadata?.full_name || user?.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {user?.user_metadata?.full_name || 'Profesor'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Docente
                                    </p>
                                </div>
                            </div>

                            <Button variant="outline" onClick={handleSignOut} className="hidden sm:flex ml-2">
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
                <div className="flex gap-6">
                    {/* Sidebar Desktop */}
                    <aside className="hidden md:block w-64 flex-shrink-0">
                        <div className="sticky top-24 space-y-2">
                            <nav className="space-y-1">
                                {navigationItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 group ${isActive
                                                ? "bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700"
                                                : "hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} shadow-md group-hover:scale-110 transition-transform`}>
                                                    <Icon className="h-4 w-4 text-white" />
                                                </div>
                                                <span className={`font-medium ${isActive
                                                    ? "text-slate-900 dark:text-slate-100"
                                                    : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                                                    }`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {isActive && (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* Sidebar Mobile */}
                    {sidebarOpen && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                            <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 p-6 overflow-y-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                                            <GraduationCap className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                                EDU CLASS
                                            </h1>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                <nav className="space-y-2">
                                    {navigationItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveTab(item.id);
                                                    setSidebarOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === item.id
                                                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                    }`}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span className="font-medium">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>

                                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        <span className="font-medium">Cerrar Sesión</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Contenido Principal */}
                    <main className="flex-1 min-w-0">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                            <span className="text-slate-400">Profesor</span>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                                {activeTab}
                            </span>
                        </div>

                        {/* Vistas */}
                        <div className="space-y-6">
                            {activeTab === "dashboard" && <DashboardSummary />}

                            {activeTab === "salones" && (
                                <TabSalones
                                    salones={salones}
                                    loading={loadingSalones}
                                    onVerEstudiantes={handleVerEstudiantes}
                                />
                            )}

                            {activeTab === "asistencia" && (
                                <TabAsistencia
                                    salones={salones}
                                    selectedSalon={selectedSalonAsistencia}
                                    onSelectSalon={handleSelectSalonAsistencia}
                                    fecha={fechaAsistencia}
                                    onSelectFecha={(date: Date | undefined) => date && setFechaAsistencia(date)}
                                    estudiantes={estudiantesAsistencia}
                                    asistencias={asistencias}
                                    onAsistenciaChange={(estudianteId, estado) => setAsistencias({ ...asistencias, [estudianteId]: estado })}
                                    onGuardar={handleGuardarAsistencia}
                                />
                            )}

                            {activeTab === "evaluaciones" && (
                                <TabEvaluaciones
                                    salones={salones}
                                    selectedSalon={selectedSalonEvaluaciones}
                                    onSelectSalon={handleSelectSalonEvaluaciones}
                                    salonCursos={salonCursos}
                                    selectedCurso={selectedCurso}
                                    onSelectCurso={handleSelectCursoEvaluaciones}
                                    competencias={competencias}
                                    estudiantes={estudiantesEvaluaciones}
                                    evaluacionesGuardadas={evaluacionesGuardadas}
                                    notas={notas}
                                    onNotaChange={(estudianteId, competenciaId, nota) => {
                                        setNotas({
                                            ...notas,
                                            [estudianteId]: {
                                                ...notas[estudianteId],
                                                [competenciaId]: nota,
                                            },
                                        });
                                    }}
                                    nombreEvaluacion={nombreEvaluacion}
                                    onNombreEvaluacionChange={setNombreEvaluacion}
                                    onGuardar={handleGuardarEvaluacion}
                                    onVerNotasEstudiante={handleVerNotasEstudiante}
                                    saving={savingEvaluacion}
                                />
                            )}

                            {activeTab === "estadisticas" && (
                                <TabEstadisticas
                                    salones={salones}
                                    selectedSalon={selectedSalonEstadisticas}
                                    onSelectSalon={setSelectedSalonEstadisticas}
                                    statsViewType={statsViewType}
                                    onStatsViewTypeChange={setStatsViewType}
                                    salonCursos={salonCursosEstadisticas}
                                    selectedCurso={selectedCursoEstadisticas}
                                    onSelectCurso={setSelectedCursoEstadisticas}
                                    estadisticasData={estadisticasData}
                                />
                            )}
                        </div>
                    </main>
                </div>
            </div> {/* Modals */}
            {selectedSalonModal && (
                <ModalVerEstudiantes
                    open={modalEstudiantesOpen}
                    onOpenChange={(open) => {
                        setModalEstudiantesOpen(open);
                        if (!open) setSelectedSalonModal(null);
                    }}
                    selectedSalon={selectedSalonModal}
                    estudiantesDelSalon={estudiantesDelSalonModal}
                />
            )}

            {estudianteSeleccionado && (
                <ModalVerNotas
                    open={modalNotasOpen}
                    onOpenChange={(open) => {
                        setModalNotasOpen(open);
                        if (!open) setEstudianteSeleccionado(null);
                    }}
                    estudianteSeleccionado={estudianteSeleccionado}
                    onEditarEvaluacion={handleEditarEvaluacion}
                    onEliminarEvaluacion={handleEliminarEvaluacion}
                    editandoEvaluacion={editandoEvaluacion}
                    setEditandoEvaluacion={setEditandoEvaluacion}
                />
            )}
        </div>
    );
}
