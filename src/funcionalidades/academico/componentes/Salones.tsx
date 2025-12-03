"use client";

import { useState, useEffect } from "react";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Badge } from "@/componentes/ui/badge";
import { Plus, Pencil, Trash2, Users, UserCheck, DoorOpen, Eye, BookOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/componentes/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/componentes/ui/collapsible";

interface Salon {
  id: string;
  codigo: string;
  nombre: string | null;
  nivel: string;
  grado: string;
  seccion: string;
  sede_id: string | null;
  profesor_id: string | null;
  capacidad: number | null;
  activo: boolean | null;
  ciclo_academico_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sedes?: { nombre: string } | null;
  profesores?: { nombres: string; apellidos: string } | null;
}

export function Salones() {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [estudiantesDialogOpen, setEstudiantesDialogOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [estudiantesSalon, setEstudiantesSalon] = useState<string[]>([]);
  const [verEstudiantesDialogOpen, setVerEstudiantesDialogOpen] = useState(false);
  const [estudiantesDelSalon, setEstudiantesDelSalon] = useState<any[]>([]);
  const [estudiantesPorSalon, setEstudiantesPorSalon] = useState<Record<string, number>>({});
  const [cursosDialogOpen, setCursosDialogOpen] = useState(false);
  const [cursosSalon, setCursosSalon] = useState<any[]>([]);
  const [competenciasDialogOpen, setCompetenciasDialogOpen] = useState(false);
  const [selectedSalonCurso, setSelectedSalonCurso] = useState<any>(null);
  const [competencias, setCompetencias] = useState<any[]>([]);
  const [competenciaForm, setCompetenciaForm] = useState({ nombre: "", descripcion: "", porcentaje: "" });
  const [editingCompetencia, setEditingCompetencia] = useState<any>(null);

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    nivel: "INICIAL",
    grado: "3 años",
    seccion: "A",
    sede_id: "",
    profesor_id: "",
    capacidad: 30,
    activo: true,
  });

  useEffect(() => {
    // Solo cargar datos en el cliente, no en el servidor
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);

  useEffect(() => {
    if (salones.length > 0) {
      loadEstudiantesCounts();
    }
  }, [salones]);

  useEffect(() => {
    if (dialogOpen && !editingSalon && salones) {
      const generarCodigo = () => {
        if (salones.length === 0) return "S-001";

        const codigos = salones
          .map(s => parseInt(s.codigo.replace("S-", "")))
          .filter(num => !isNaN(num))
          .sort((a, b) => b - a);

        const ultimoCodigo = codigos[0] || 0;
        const nuevoCodigo = `S-${(ultimoCodigo + 1).toString().padStart(3, "0")}`;
        return nuevoCodigo;
      };

      setFormData(prev => ({ ...prev, codigo: generarCodigo() }));
    }
  }, [dialogOpen, salones, editingSalon]);

  const loadData = async () => {
    try {
      setLoading(true);

      const supabase = supabaseFailover.getDirectClient();
      const [{ data: sedesData }, { data: salonesData }, { data: profesoresData }, { data: estudiantesData }, { data: cursosData }] = await Promise.all([
        supabase.from("sedes").select("*"),
        supabase.from("salones").select("*, sedes(nombre), profesores(nombres, apellidos)").order("codigo"),
        supabase.from("profesores").select("*").eq("estado", "activo"),
        supabase.from("estudiantes").select("*").eq("estado", "activo"),
        supabase.from("cursos").select("*").eq("activo", true),
      ]);

      if (sedesData) {
        setSedes(sedesData);
        if (sedesData.length > 0 && !formData.sede_id) {
          setFormData(prev => ({ ...prev, sede_id: (sedesData as any[])[0].id }));
        }
      }
      if (salonesData) setSalones(salonesData as any);
      if (profesoresData) setProfesores(profesoresData);
      if (estudiantesData) setEstudiantes(estudiantesData);
      if (cursosData) setCursos(cursosData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadEstudiantesCounts = async () => {
    const supabase = supabaseFailover.getDirectClient();
    const counts: Record<string, number> = {};
    for (const salon of salones) {
      const { count } = await supabase
        .from("estudiantes_salones")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salon.id)
        .eq("activo", true);
      counts[salon.id] = count || 0;
    }
    setEstudiantesPorSalon(counts);
  };

  const loadEstudiantesSalon = async (salonId: string) => {
    try {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;
      setEstudiantesSalon((data as any[])?.map(e => e.estudiante_id) || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estudiantes del salón");
    }
  };

  const handleVerEstudiantes = async (salon: Salon) => {
    try {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("estudiantes_salones")
        .select("estudiante_id, estudiantes(dni, nombres, apellidos, email)")
        .eq("salon_id", salon.id)
        .eq("activo", true);

      if (error) throw error;

      const estudiantesConInfo = (data as any[])?.map(item => item.estudiantes).filter(Boolean) || [];
      setEstudiantesDelSalon(estudiantesConInfo);
      setSelectedSalon(salon);
      setVerEstudiantesDialogOpen(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estudiantes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sede_id) {
      toast.error("Debe seleccionar una sede");
      return;
    }

    try {
      setLoading(true); // Deshabilitar botón durante el guardado

      // Sede ID es obligatorio y debe ser string según la definición de la tabla
      const payload = {
        ...formData,
        sede_id: formData.sede_id,
        profesor_id: formData.profesor_id || null,
      };

      if (editingSalon) {
        const { error } = await supabaseFailover.update("salones", editingSalon.id, payload);

        if (error) throw error;

        // También actualizar o crear el grado_seccion correspondiente
        await sincronizarGradoSeccion(payload as any);

        toast.success("Salón actualizado exitosamente");
      } else {
        const { error } = await supabaseFailover.insert("salones", payload);

        if (error) throw error;

        // Crear el grado_seccion correspondiente automáticamente
        await sincronizarGradoSeccion(payload as any);

        toast.success("Salón y grado/sección creados exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error:", JSON.stringify(error, null, 2));
      toast.error(error.message || "Error al guardar");
    } finally {
      setLoading(false); // Re-habilitar botón
    }
  };

  // Función para sincronizar grados_secciones cuando se crea/actualiza un salón
  const sincronizarGradoSeccion = async (salonData: typeof formData) => {
    console.log("Sincronizando grado y sección...", salonData);

    if (!salonData.sede_id) {
      console.warn(" No se puede sincronizar grado/sección sin sede_id");
      return;
    }

    const supabase = supabaseFailover.getDirectClient();

    // Buscar si ya existe este grado/sección en esta sede
    const { data: existente } = await supabase
      .from("grados_secciones")
      .select("id")
      .eq("nivel", salonData.nivel)
      .eq("grado", salonData.grado)
      .eq("seccion", salonData.seccion)
      .eq("sede_id", salonData.sede_id)
      .maybeSingle();

    if (existente) {
      console.log(" Grado/sección ya existe:", existente.id);
      // Asegurarnos de que esté activo EN AMBAS BASES DE DATOS
      await supabaseFailover.update("grados_secciones", existente.id, {
        activo: salonData.activo
      });
    } else {
      // Crear nuevo grado/sección EN AMBAS BASES DE DATOS
      console.log("➕ Creando nuevo grado/sección en AMBAS bases...");
      const { error } = await supabaseFailover.insert("grados_secciones", {
        nivel: salonData.nivel,
        grado: salonData.grado,
        seccion: salonData.seccion,
        sede_id: salonData.sede_id!,
        activo: salonData.activo
      });

      if (error) {
        console.error("Error creando grado/sección:", error);
        // No lanzar error aquí para no bloquear la creación del salón
        toast.warning("Salón creado pero hubo un problema al sincronizar grado/sección");
      } else {
        console.log(" Grado/sección creado exitosamente en AMBAS bases de datos");
      }
    }
  };

  const handleEdit = (salon: Salon) => {
    setEditingSalon(salon);
    setFormData({
      codigo: salon.codigo,
      nombre: salon.nombre || "",
      nivel: salon.nivel,
      grado: salon.grado,
      seccion: salon.seccion,
      sede_id: salon.sede_id || "",
      profesor_id: salon.profesor_id || "",
      capacidad: salon.capacidad || 30,
      activo: salon.activo ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este salón? Esto eliminará todas las asignaciones de estudiantes y cursos.")) return;

    try {
      setLoading(true);
      const supabase = supabaseFailover.getDirectClient();
      let deletedCounts = {
        estudiantes: 0,
        competencias: 0,
        salonCursos: 0
      };

      // 1. Eliminar estudiantes_salones
      const { data: estudiantesSalones } = await supabase
        .from("estudiantes_salones")
        .select("id")
        .eq("salon_id", id);

      if (estudiantesSalones && estudiantesSalones.length > 0) {
        console.log(`Eliminando ${estudiantesSalones.length} asignaciones de estudiantes...`);
        for (const es of estudiantesSalones) {
          await supabaseFailover.delete("estudiantes_salones", es.id);
        }
        deletedCounts.estudiantes = estudiantesSalones.length;
      }

      // 2. Eliminar salon_cursos (y sus competencias)
      const { data: salonCursos } = await supabase
        .from("salon_cursos")
        .select("id")
        .eq("salon_id", id);

      if (salonCursos && salonCursos.length > 0) {
        console.log(`Eliminando ${salonCursos.length} asignaciones de cursos...`);
        for (const sc of salonCursos) {
          // Eliminar competencias del salon_curso
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

          // Eliminar salon_curso
          await supabaseFailover.delete("salon_cursos", sc.id);
        }
        deletedCounts.salonCursos = salonCursos.length;
      }

      // 3. Eliminar el salón
      const { error } = await supabaseFailover.delete("salones", id);

      if (error) throw error;

      const total = deletedCounts.estudiantes + deletedCounts.competencias + deletedCounts.salonCursos;
      toast.success(`Salón eliminado (${total} registros relacionados eliminados)`);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      nombre: "",
      nivel: "INICIAL",
      grado: "3 años",
      seccion: "A",
      sede_id: sedes[0]?.id || "",
      profesor_id: "",
      capacidad: 30,
      activo: true
    });
    setEditingSalon(null);
  };

  const getGradoOptions = () => {
    if (formData.nivel === "INICIAL") {
      return ["3 años", "4 años", "5 años"];
    }
    return ["1°", "2°", "3°", "4°", "5°", "6°"];
  };

  const handleOpenEstudiantes = async (salon: Salon) => {
    setSelectedSalon(salon);
    await loadEstudiantesSalon(salon.id);
    setEstudiantesDialogOpen(true);
  };

  const handleToggleEstudiante = (estudianteId: string) => {
    setEstudiantesSalon(prev => {
      if (prev.includes(estudianteId)) {
        return prev.filter(id => id !== estudianteId);
      }
      return [...prev, estudianteId];
    });
  };

  const handleSaveEstudiantes = async () => {
    if (!selectedSalon) return;

    try {
      // Eliminar asignaciones anteriores usando supabase directo (requiere .eq)
      const supabase = supabaseFailover.getDirectClient();
      await supabase
        .from("estudiantes_salones")
        .delete()
        .eq("salon_id", selectedSalon.id);

      // Insertar nuevas asignaciones
      if (estudiantesSalon.length > 0) {
        const inserts = estudiantesSalon.map(estudianteId => ({
          estudiante_id: estudianteId,
          salon_id: selectedSalon.id,
          periodo_academico: new Date().getFullYear().toString(),
          activo: true,
        }));

        const { error } = await supabaseFailover.insert("estudiantes_salones", inserts);

        if (error) throw error;
      }

      toast.success("Estudiantes asignados exitosamente");
      setEstudiantesDialogOpen(false);
      loadEstudiantesCounts();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al asignar estudiantes");
    }
  };

  const handleOpenCursos = async (salon: Salon) => {
    setSelectedSalon(salon);
    await loadCursosSalon(salon.id);
    setCursosDialogOpen(true);
  };

  const loadCursosSalon = async (salonId: string) => {
    try {
      const supabase = supabaseFailover.getDirectClient();
      const { data, error } = await supabase
        .from("salon_cursos")
        .select("*, cursos(id, codigo, nombre)")
        .eq("salon_id", salonId)
        .eq("activo", true);

      if (error) throw error;
      setCursosSalon(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar cursos del salón");
    }
  };

  const handleAddCursoToSalon = async (cursoId: string) => {
    if (!selectedSalon) return;

    try {
      const { error } = await supabaseFailover.insert("salon_cursos", {
        salon_id: selectedSalon.id,
        curso_id: cursoId,
        activo: true,
      });

      if (error) throw error;
      toast.success("Curso agregado al salón");
      loadCursosSalon(selectedSalon.id);
    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === "23505") {
        toast.error("Este curso ya está asignado al salón");
      } else {
        toast.error("Error al agregar curso");
      }
    }
  };

  const handleRemoveCursoFromSalon = async (salonCursoId: string) => {
    try {
      const { error } = await supabaseFailover.delete("salon_cursos", salonCursoId);

      if (error) throw error;
      toast.success("Curso eliminado del salón");
      if (selectedSalon) {
        loadCursosSalon(selectedSalon.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar curso");
    }
  };

  const handleOpenCompetencias = async (salonCurso: any) => {
    setSelectedSalonCurso(salonCurso);
    await loadCompetencias(salonCurso.id);
    setCompetenciasDialogOpen(true);
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
      toast.error("Error al cargar competencias");
    }
  };

  const handleAddCompetencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalonCurso) return;

    try {
      const porcentaje = parseFloat(competenciaForm.porcentaje);
      if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        toast.error("El porcentaje debe ser entre 0 y 100");
        return;
      }

      // Verificar que la suma de porcentajes no exceda 100
      const sumaActual = competencias
        .filter(c => c.id !== editingCompetencia?.id)
        .reduce((sum, c) => sum + parseFloat(c.porcentaje), 0);

      if (sumaActual + porcentaje > 100) {
        toast.error(`La suma de porcentajes no puede exceder 100%. Actual: ${sumaActual}%`);
        return;
      }

      if (editingCompetencia) {
        // Actualizar competencia existente
        const { error } = await supabaseFailover.update("competencias", editingCompetencia.id, {
          nombre: competenciaForm.nombre,
          descripcion: competenciaForm.descripcion,
          porcentaje: porcentaje,
        });

        if (error) throw error;
        toast.success("Competencia actualizada");
        setEditingCompetencia(null);
      } else {
        // Agregar nueva competencia
        const { error } = await supabaseFailover.insert("competencias", {
          salon_curso_id: selectedSalonCurso.id,
          nombre: competenciaForm.nombre,
          descripcion: competenciaForm.descripcion,
          porcentaje: porcentaje,
        });

        if (error) throw error;
        toast.success("Competencia agregada");
      }

      setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
      loadCompetencias(selectedSalonCurso.id);
    } catch (error) {
      console.error("Error:", error);
      toast.error(editingCompetencia ? "Error al actualizar competencia" : "Error al agregar competencia");
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
    return Math.abs(sumaTotal - 100) < 0.01; // Permitir pequeña diferencia por redondeo
  };

  const handleDeleteCompetencia = async (competenciaId: string) => {
    if (!confirm("¿Eliminar esta competencia?")) return;

    try {
      const { error } = await supabaseFailover.delete("competencias", competenciaId);

      if (error) throw error;
      toast.success("Competencia eliminada");
      if (selectedSalonCurso) {
        loadCompetencias(selectedSalonCurso.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar competencia");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-slate-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-slate-600 bg-clip-text text-transparent">
              Gestión de Salones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Administración de aulas y asignación de cursos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Salón
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editingSalon ? "Editar Salón" : "Crear Nuevo Salón"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codigo" className="text-foreground">Código (Generado automáticamente)</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      readOnly
                      className="bg-muted text-muted-foreground"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nombre" className="text-foreground">Nombre del Salón</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Salón A"
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nivel" className="text-foreground">Nivel</Label>
                    <Select value={formData.nivel} onValueChange={(value) => {
                      const newGrado = value === "INICIAL" ? "3 años" : "1°";
                      setFormData({ ...formData, nivel: value, grado: newGrado });
                    }}>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="INICIAL">INICIAL</SelectItem>
                        <SelectItem value="PRIMARIA">PRIMARIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="grado" className="text-foreground">Grado</Label>
                    <Select value={formData.grado} onValueChange={(value) => setFormData({ ...formData, grado: value })}>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {getGradoOptions().map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="seccion" className="text-foreground">Sección</Label>
                    <Input
                      id="seccion"
                      value={formData.seccion}
                      onChange={(e) => setFormData({ ...formData, seccion: e.target.value.toUpperCase() })}
                      maxLength={1}
                      pattern="[A-Z]"
                      required
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sede" className="text-foreground">Sede</Label>
                    <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })} required disabled>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {sedes.map((sede) => (
                          <SelectItem key={sede.id} value={sede.id}>{sede.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="profesor" className="text-foreground">Profesor Asignado (Opcional)</Label>
                    <Select value={formData.profesor_id || undefined} onValueChange={(value) => setFormData({ ...formData, profesor_id: value || "" })}>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {profesores.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nombres} {prof.apellidos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="capacidad" className="text-foreground">Capacidad</Label>
                    <Input
                      id="capacidad"
                      type="number"
                      value={formData.capacidad || ""}
                      onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value) || 30 })}
                      min="1"
                      required
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="activo" className="text-foreground">Activo</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {loading ? "Guardando..." : (editingSalon ? "Actualizar" : "Crear")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Lista de Salones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-950">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Código</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nombre</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nivel</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Grado</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Sección</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estudiantes</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Profesor</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estado</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salones.map((salon) => (
                <TableRow key={salon.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <TableCell className="font-medium text-slate-700 dark:text-slate-300">{salon.codigo}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">{salon.nombre || "-"}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">{salon.nivel}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">{salon.grado}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">{salon.seccion}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800">
                      {estudiantesPorSalon[salon.id] || 0} / {salon.capacidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {salon.profesores
                      ? `${salon.profesores.nombres} ${salon.profesores.apellidos}`
                      : <span className="text-slate-400 italic">Sin asignar</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={salon.activo ? "default" : "secondary"} className={salon.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "bg-slate-100 text-slate-500"}>
                      {salon.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleVerEstudiantes(salon)}
                        title="Ver estudiantes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleOpenEstudiantes(salon)}
                        title="Asignar estudiantes"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-violet-600 hover:bg-violet-50"
                        onClick={() => handleOpenCursos(salon)}
                        title="Gestionar cursos"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleEdit(salon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(salon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {salones.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DoorOpen className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No hay salones registrados</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                Comience creando los salones para su institución educativa.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={estudiantesDialogOpen} onOpenChange={setEstudiantesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Asignar Estudiantes - <span className="text-indigo-600">{selectedSalon?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-2">
              {estudiantes.map((estudiante) => (
                <div key={estudiante.id} className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${estudiantesSalon.includes(estudiante.id) ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <Checkbox
                    checked={estudiantesSalon.includes(estudiante.id)}
                    onCheckedChange={() => handleToggleEstudiante(estudiante.id)}
                    className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {estudiante.nombres} {estudiante.apellidos}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      DNI: {estudiante.dni}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setEstudiantesDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEstudiantes} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Guardar Asignaciones
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={verEstudiantesDialogOpen} onOpenChange={setVerEstudiantesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Estudiantes del Salón <span className="text-indigo-600">{selectedSalon?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {estudiantesDelSalon.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-semibold">DNI</TableHead>
                      <TableHead className="font-semibold">Nombres</TableHead>
                      <TableHead className="font-semibold">Apellidos</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estudiantesDelSalon.map((estudiante: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{estudiante.dni}</TableCell>
                        <TableCell>{estudiante.nombres}</TableCell>
                        <TableCell>{estudiante.apellidos}</TableCell>
                        <TableCell className="text-slate-500">{estudiante.email || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No hay estudiantes asignados a este salón</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setVerEstudiantesDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cursosDialogOpen} onOpenChange={setCursosDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Gestionar Cursos - <span className="text-indigo-600">{selectedSalon?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <Label className="mb-2 block text-slate-700 dark:text-slate-300">Agregar Curso</Label>
              <Select onValueChange={handleAddCursoToSalon}>
                <SelectTrigger className="bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Seleccionar curso para agregar" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.id} value={curso.id}>
                      {curso.codigo} - {curso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Cursos Asignados
              </h3>
              {cursosSalon.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cursosSalon.map((sc) => (
                    <Card key={sc.id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{sc.cursos?.nombre}</p>
                            <p className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block mt-1">{sc.cursos?.codigo}</p>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                              onClick={() => handleOpenCompetencias(sc)}
                              title="Configurar competencias"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => handleRemoveCursoFromSalon(sc.id)}
                              title="Eliminar curso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>No hay cursos asignados a este salón</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setCursosDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={competenciasDialogOpen} onOpenChange={setCompetenciasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Competencias - <span className="text-indigo-600">{selectedSalonCurso?.cursos?.nombre}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleAddCompetencia} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre-comp" className="text-slate-700 dark:text-slate-300">Nombre de la Competencia</Label>
                  <Input
                    id="nombre-comp"
                    value={competenciaForm.nombre}
                    onChange={(e) => setCompetenciaForm({ ...competenciaForm, nombre: e.target.value })}
                    required
                    placeholder="Ej: Razonamiento Matemático"
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <Label htmlFor="porcentaje" className="text-slate-700 dark:text-slate-300">Porcentaje (%)</Label>
                  <Input
                    id="porcentaje"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={competenciaForm.porcentaje}
                    onChange={(e) => setCompetenciaForm({ ...competenciaForm, porcentaje: e.target.value })}
                    required
                    placeholder="Ej: 25"
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="descripcion-comp" className="text-slate-700 dark:text-slate-300">Descripción</Label>
                <Input
                  id="descripcion-comp"
                  value={competenciaForm.descripcion}
                  onChange={(e) => setCompetenciaForm({ ...competenciaForm, descripcion: e.target.value })}
                  placeholder="Descripción opcional de la competencia"
                  className="bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex gap-2 justify-end">
                {editingCompetencia && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar Edición
                  </Button>
                )}
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {editingCompetencia ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Competencia
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Competencia
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div>
              <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Competencias Configuradas</span>
                {competencias.length > 0 && (
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${validateCompetenciasSuma()
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}>
                    Total: {competencias.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0).toFixed(2)}%
                    {!validateCompetenciasSuma() && " (Incompleto)"}
                  </span>
                )}
              </h3>
              {competencias.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="font-semibold">Competencia</TableHead>
                        <TableHead className="font-semibold">Descripción</TableHead>
                        <TableHead className="font-semibold text-right">Porcentaje</TableHead>
                        <TableHead className="font-semibold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competencias.map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.nombre}</TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {comp.descripcion || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-slate-50">{comp.porcentaje}%</Badge>
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
                <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                  <p>No hay competencias configuradas para este curso</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              {competencias.length > 0 && !validateCompetenciasSuma() ? (
                <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center font-medium">
                  Las competencias deben sumar exactamente 100%
                </p>
              ) : <div></div>}
              <Button
                variant="outline"
                onClick={() => {
                  if (competencias.length > 0 && !validateCompetenciasSuma()) {
                    toast.error("Las competencias deben sumar exactamente 100%");
                    return;
                  }
                  setCompetenciasDialogOpen(false);
                  setEditingCompetencia(null);
                  setCompetenciaForm({ nombre: "", descripcion: "", porcentaje: "" });
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
