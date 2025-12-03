"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { useActivityLogger } from "@/ganchos/useActivityLogger";
import { BookOpen, Plus, Users, Award, Pencil, Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/ganchos/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/componentes/ui/collapsible";
import { Badge } from "@/componentes/ui/badge";

const Cursos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logCreate, logDelete } = useActivityLogger();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    nivel: "",
  });

  
  const [competenciasDialogOpen, setCompetenciasDialogOpen] = useState(false);
  const [selectedCursoForComp, setSelectedCursoForComp] = useState<any>(null);
  const [salonCursosForCurso, setSalonCursosForCurso] = useState<any[]>([]);
  const [selectedSalonCurso, setSelectedSalonCurso] = useState<any>(null);
  const [competencias, setCompetencias] = useState<any[]>([]);
  const [competenciaForm, setCompetenciaForm] = useState({ nombre: "", descripcion: "", porcentaje: "" });
  const [editingCompetencia, setEditingCompetencia] = useState<any>(null);

  const { data: cursos, isLoading } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("cursos")
        .select(`
          *,
          profesores(nombres, apellidos, especialidad)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: typeof window !== 'undefined',
  });

  
  useEffect(() => {
    if (open && cursos) {
      const generarCodigo = () => {
        if (cursos.length === 0) return "001";

        
        const codigos = (cursos as any[])
          .map(c => parseInt(c.codigo))
          .filter(num => !isNaN(num))
          .sort((a, b) => b - a);

        const ultimoCodigo = codigos[0] || 0;
        const nuevoCodigo = (ultimoCodigo + 1).toString().padStart(3, "0");
        return nuevoCodigo;
      };

      setFormData(prev => ({ ...prev, codigo: generarCodigo(), nombre: "", descripcion: "", nivel: "" }));
    }
  }, [open, cursos]);

  const { data: estudiantesPorCurso } = useQuery({
    queryKey: ["estudiantes-por-curso"],
    queryFn: async () => {
      const supabase = supabaseFailover.getDirectClient();

      
      const { data: salonCursos, error: scError } = await supabase
        .from("salon_cursos")
        .select(`
          id,
          curso_id,
          salon_id
        `)
        .eq("activo", true);

      if (scError) throw scError;

      
      const estudiantesPorCursoMap: Record<string, any[]> = {};

      for (const sc of salonCursos || []) {
        const { data: estudiantesSalon, error: esError } = await supabase
          .from("estudiantes_salones")
          .select(`
            estudiante_id,
            estudiantes(id, nombres, apellidos, dni)
          `)
          .eq("salon_id", sc.salon_id)
          .eq("activo", true);

        if (esError) throw esError;

        if (!estudiantesPorCursoMap[sc.curso_id]) {
          estudiantesPorCursoMap[sc.curso_id] = [];
        }

        
        for (const es of estudiantesSalon || []) {
          const yaExiste = estudiantesPorCursoMap[sc.curso_id].some(
            (e: any) => (e.estudiantes as any)?.id === (es.estudiantes as any)?.id
          );
          if (!yaExiste) {
            estudiantesPorCursoMap[sc.curso_id].push(es);
          }
        }
      }

      return estudiantesPorCursoMap;
    },
    enabled: typeof window !== 'undefined',
  });

  const { data: estadisticas } = useQuery({
    queryKey: ["estadisticas-cursos"],
    queryFn: async () => {
      const supabase = supabaseFailover.getDirectClient();
      const stats: Record<string, { total_estudiantes: number }> = {};
      if (!cursos) return stats;

      for (const curso of (cursos as any[])) {
        const { data, error } = await supabase.rpc("obtener_estadisticas_curso", {
          p_curso_id: curso.id,
        } as any);
        if (!error && data) {
          stats[curso.id] = data as { total_estudiantes: number };
        }
      }
      return stats;
    },
    enabled: !!cursos && typeof window !== 'undefined',
  });

  const { data: competenciasPorCurso } = useQuery({
    queryKey: ["competencias-por-curso"],
    queryFn: async () => {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("salon_cursos")
        .select(`
          curso_id,
          competencias(
            id,
            nombre,
            descripcion,
            porcentaje
          )
        `)
        .eq("activo", true);

      if (error) throw error;

      
      const competenciasByCurso: Record<string, any[]> = {};
      data?.forEach((sc: any) => {
        if (sc.competencias && sc.curso_id) {
          if (!competenciasByCurso[sc.curso_id]) {
            competenciasByCurso[sc.curso_id] = [];
          }
          if (Array.isArray(sc.competencias)) {
            competenciasByCurso[sc.curso_id].push(...sc.competencias);
          } else {
            competenciasByCurso[sc.curso_id].push(sc.competencias);
          }
        }
      });

      return competenciasByCurso;
    },
    enabled: typeof window !== 'undefined',
  });

  const createCurso = useMutation({
    mutationFn: async (newCurso: typeof formData) => {
      const { data, error } = await supabaseFailover.insert("cursos", newCurso);
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      
      if (data && data.length > 0) {
        await logCreate('cursos', 'Curso', (data as any)[0].id, (data as any)[0]);
      }

      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      sonnerToast.success("Curso registrado exitosamente");
      setOpen(false);
      setFormData({ codigo: "", nombre: "", descripcion: "", nivel: "" });
    },
    onError: (error) => {
      sonnerToast.error(`Error al registrar curso: ${error.message}`);
    },
  });

  const deleteCurso = useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseFailover.getDirectClient();
      let deletedCounts = {
        competencias: 0,
        salonCursos: 0,
        matriculas: 0
      };

      
      const { data: salonCursos } = await supabase
        .from("salon_cursos")
        .select("id")
        .eq("curso_id", id);

      
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select("id")
        .eq("curso_id", id);

      if (matriculas && matriculas.length > 0) {
        console.log(`Eliminando ${matriculas.length} matrículas del curso...`);
        for (const matricula of matriculas) {
          await supabaseFailover.delete("matriculas", matricula.id);
        }
        deletedCounts.matriculas = matriculas.length;
      }

      if (salonCursos && salonCursos.length > 0) {
        console.log(`Eliminando ${salonCursos.length} asignaciones salon-curso...`);

        
        for (const sc of salonCursos) {
          const { data: competencias } = await supabase
            .from("competencias")
            .select("id")
            .eq("salon_curso_id", sc.id);

          if (competencias && competencias.length > 0) {
            for (const comp of competencias) {
              await supabaseFailover.delete("competencias", comp.id);
            }
            deletedCounts.competencias += competencias.length;
          }

          
          await supabaseFailover.delete("salon_cursos", sc.id);
        }
        deletedCounts.salonCursos = salonCursos.length;
      }

      
      const { error } = await supabaseFailover.delete("cursos", id);
      if (error) throw error;

      return { id, deletedCounts };
    },
    onSuccess: async (result) => {
      
      await logDelete('cursos', 'Curso', result.id, {});

      queryClient.invalidateQueries({ queryKey: ["cursos"] });
      const total = result.deletedCounts.competencias + result.deletedCounts.salonCursos + (result.deletedCounts.matriculas || 0);
      sonnerToast.success(`Curso eliminado (${total} registros relacionados eliminados)`);
    },
    onError: (error) => {
      sonnerToast.error(`Error al eliminar curso: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este curso?")) {
      deleteCurso.mutate(id);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCurso.mutate(formData);
  };

  
  const handleOpenGestionCompetencias = async (curso: any) => {
    setSelectedCursoForComp(curso);
    setCompetenciasDialogOpen(true); 
    await loadSalonCursosForCurso(curso.id); 
  };

  const loadSalonCursosForCurso = async (cursoId: string) => {
    try {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("salon_cursos")
        .select("*, salones(codigo, nombre, grado,  seccion)")
        .eq("curso_id", cursoId)
        .eq("activo", true);

      if (error) throw error;
      setSalonCursosForCurso(data || []);
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al cargar salones del curso");
    }
  };

  const loadCompetencias = async (salonCursoId: string) => {
    try {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("competencias")
        .select("*")
        .eq("salon_curso_id", salonCursoId)
        .order("nombre");

      if (error) throw error;
      setCompetencias(data || []);
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al cargar competencias");
    }
  };

  const handleSelectSalonCurso = async (salonCurso: any) => {
    setSelectedSalonCurso(salonCurso);
    await loadCompetencias(salonCurso.id);
  };

  const handleAddCompetencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalonCurso) return;

    try {
      const porcentaje = parseFloat(competenciaForm.porcentaje);
      if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        sonnerToast.error("El porcentaje debe ser entre 0 y 100");
        return;
      }

      
      const sumaActual = competencias
        .filter(c => c.id !== editingCompetencia?.id)
        .reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);

      if (sumaActual + porcentaje > 100) {
        sonnerToast.error(`La suma de porcentajes no puede exceder 100%. Actual: ${sumaActual}%`);
        return;
      }

      if (editingCompetencia) {
        const { error } = await supabaseFailover.update("competencias", editingCompetencia.id, {
          nombre: competenciaForm.nombre,
          descripcion: competenciaForm.descripcion,
          porcentaje: porcentaje,
        });

        if (error) throw error;
        sonnerToast.success("Competencia actualizada");
        setEditingCompetencia(null);
      } else {
        const { error } = await supabaseFailover.insert("competencias", {
          salon_curso_id: selectedSalonCurso.id,
          nombre: competenciaForm.nombre,
          descripcion: competenciaForm.descripcion,
          porcentaje: porcentaje,
        });

        if (error) throw error;
        sonnerToast.success("Competencia agregada");
      }

      setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
      loadCompetencias(selectedSalonCurso.id);
      queryClient.invalidateQueries({ queryKey: ["competencias-por-curso"] });
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error(editingCompetencia ? "Error al actualizar competencia" : "Error al agregar competencia");
    }
  };

  const handleEditCompetencia = (competencia: any) => {
    setEditingCompetencia(competencia);
    setCompetenciaForm({
      nombre: competencia.nombre,
      descripcion: competencia.descripcion || "",
      porcentaje: competencia.porcentaje.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingCompetencia(null);
    setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
  };

  const validateCompetenciasSuma = () => {
    const sumaTotal = competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);
    return Math.abs(sumaTotal - 100) < 0.01;
  };

  const handleDeleteCompetencia = async (competenciaId: string) => {
    if (!confirm("¿Eliminar esta competencia?")) return;

    try {
      const { error } = await supabaseFailover.delete("competencias", competenciaId);

      if (error) throw error;
      sonnerToast.success("Competencia eliminada");
      if (selectedSalonCurso) {
        loadCompetencias(selectedSalonCurso.id);
      }
      queryClient.invalidateQueries({ queryKey: ["competencias-por-curso"] });
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Error al eliminar competencia");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-slate-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-slate-600 bg-clip-text text-transparent">
              Cursos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gestión académica y asignación de competencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Registrar Nuevo Curso</DialogTitle>
                <DialogDescription className="text-muted-foreground">Complete los datos del curso</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo" className="text-foreground">Código (Generado automáticamente)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-foreground">Nombre del Curso</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="text-foreground">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel" className="text-foreground">Nivel</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger className="bg-background text-foreground">
                      <SelectValue placeholder="Seleccione un nivel" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value="inicial">INICIAL</SelectItem>
                      <SelectItem value="primaria">PRIMARIA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createCurso.isPending}>
                  {createCurso.isPending ? "Creando..." : "Registrar Curso"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Cursos</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(cursos as any[])?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <CardContent className="p-0 bg-transparent border-0">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando cursos...</div>
        ) : (
          <div className="space-y-4">
            {(cursos as any[])?.map((curso) => {
              const estudiantesCurso = estudiantesPorCurso?.[curso.id] || [];
              const stats = estadisticas?.[curso.id];
              const competencias = competenciasPorCurso?.[curso.id] || [];

              
              const competenciasUnicas = Array.from(
                new Map(competencias.map((c: any) => [c.id, c])).values()
              );

              return (
                <Collapsible key={curso.id}>
                  <Card className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <CollapsibleTrigger className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left group-hover:translate-x-1 duration-300">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">{curso.nombre}</CardTitle>
                              <span className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                                {curso.codigo}
                              </span>
                            </div>
                          </CollapsibleTrigger>
                          <CardDescription className="mt-2 text-slate-500 dark:text-slate-400 ml-13 pl-13">
                            {curso.descripcion}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:hover:bg-indigo-900/30 dark:text-indigo-300"
                            onClick={() => handleOpenGestionCompetencias(curso)}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Competencias
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            onClick={() => handleDelete(curso.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-6 mt-4 ml-13 pl-13 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Users className="h-4 w-4 text-indigo-500" />
                          <span>Estudiantes: <span className="font-semibold text-slate-900 dark:text-white">{estudiantesCurso.length}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Award className="h-4 w-4 text-indigo-500" />
                          <span>Competencias: <span className="font-semibold text-slate-900 dark:text-white">{competenciasUnicas.length}</span></span>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="grid md:grid-cols-2 gap-8 pt-6">
                          <div>
                            <h4 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                              <Award className="h-4 w-4 text-indigo-500" />
                              Competencias Asignadas
                            </h4>
                            {competenciasUnicas.length > 0 ? (
                              <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Competencia</TableHead>
                                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Peso</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {competenciasUnicas.map((comp: any) => (
                                      <TableRow key={comp.id}>
                                        <TableCell>
                                          <div className="font-medium text-slate-700 dark:text-slate-300">{comp.nombre}</div>
                                          <div className="text-xs text-slate-500">{comp.descripcion}</div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                            {comp.porcentaje}%
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500 text-sm">No hay competencias asignadas</p>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                              <Users className="h-4 w-4 text-indigo-500" />
                              Estudiantes Matriculados
                            </h4>
                            {estudiantesCurso.length > 0 ? (
                              <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[300px] overflow-y-auto">
                                <Table>
                                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                    <TableRow>
                                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Estudiante</TableHead>
                                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">DNI</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {estudiantesCurso.map((estudiante: any) => (
                                      <TableRow key={estudiante.estudiante_id}>
                                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                          {estudiante.estudiantes?.apellidos}, {estudiante.estudiantes?.nombres}
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                          {estudiante.estudiantes?.dni}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-slate-500 text-sm">No hay estudiantes matriculados</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog para gestión de competencias */}
      <Dialog open={competenciasDialogOpen} onOpenChange={(open) => {
        setCompetenciasDialogOpen(open);
        if (!open) {
          setSelectedCursoForComp(null);
          setSalonCursosForCurso([]);
          setSelectedSalonCurso(null);
          setCompetencias([]);
          setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
          setEditingCompetencia(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Gestionar Competencias - <span className="text-indigo-600">{selectedCursoForComp?.nombre}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecciona un salón y gestiona las competencias del curso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selector de Salón */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Seleccionar Salón</Label>
              <Select
                value={selectedSalonCurso?.id}
                onValueChange={(value) => {
                  const sc = salonCursosForCurso.find(s => s.id === value);
                  if (sc) handleSelectSalonCurso(sc);
                }}
              >
                <SelectTrigger className="bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Seleccione un salón para gestionar" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {salonCursosForCurso.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.salones?.codigo} - {sc.salones?.grado} {sc.salones?.seccion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSalonCurso && (
              <>
                {/* Formulario para agregar/editar competencia */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-indigo-500" />
                      {editingCompetencia ? "Editar Competencia" : "Agregar Nueva Competencia"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddCompetencia} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="comp-nombre" className="text-slate-700 dark:text-slate-300">Nombre</Label>
                          <Input
                            id="comp-nombre"
                            value={competenciaForm.nombre}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, nombre: e.target.value })}
                            placeholder="Ej: Examen Parcial"
                            required
                            className="bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <Label htmlFor="comp-descripcion" className="text-slate-700 dark:text-slate-300">Descripción</Label>
                          <Input
                            id="comp-descripcion"
                            value={competenciaForm.descripcion}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, descripcion: e.target.value })}
                            placeholder="Opcional"
                            className="bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <Label htmlFor="comp-porcentaje" className="text-slate-700 dark:text-slate-300">Porcentaje (%)</Label>
                          <Input
                            id="comp-porcentaje"
                            type="number"
                            step="0.01"
                            value={competenciaForm.porcentaje}
                            onChange={(e) => setCompetenciaForm({ ...competenciaForm, porcentaje: e.target.value })}
                            placeholder="0-100"
                            required
                            className="bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {editingCompetencia && (
                          <Button type="button" variant="outline" onClick={handleCancelEdit}>
                            Cancelar
                          </Button>
                        )}
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                          <Save className="h-4 w-4 mr-2" />
                          {editingCompetencia ? "Actualizar" : "Agregar"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Lista de competencias */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                      Competencias Configuradas
                      {competencias.length > 0 && (
                        <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${validateCompetenciasSuma() ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          Total: {competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0).toFixed(2)}%
                        </span>
                      )}
                    </h4>
                  </div>

                  {competencias.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                          <TableRow>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nombre</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Descripción</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Porcentaje</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competencias.map((comp) => (
                            <TableRow key={comp.id}>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">{comp.nombre}</TableCell>
                              <TableCell className="text-slate-500">{comp.descripcion || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                  {parseFloat(comp.porcentaje).toFixed(2)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => handleEditCompetencia(comp)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={() => handleDeleteCompetencia(comp.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg border-slate-300 dark:border-slate-700">
                      <p>No hay competencias configuradas para este salón</p>
                    </div>
                  )}
                </div>

                {competencias.length > 0 && !validateCompetenciasSuma() && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-3 rounded-md text-sm border border-rose-200 dark:border-rose-800 flex items-center gap-2 font-medium">
                    La suma de los porcentajes debe ser exactamente 100%
                  </div>
                )}
              </>
            )}

            {!selectedSalonCurso && salonCursosForCurso.length === 0 && (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg border-slate-300 dark:border-slate-700">
                <p>Este curso no está asignado a ningún salón</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cursos;
