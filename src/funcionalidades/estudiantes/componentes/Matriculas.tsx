"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActivityLogger } from "@/ganchos/useActivityLogger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { toast } from "sonner";
import { BookOpen, Eye, Edit, Trash2 } from "lucide-react";

export function Matriculas() {
  const queryClient = useQueryClient();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMatriculaOpen, setViewMatriculaOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<any>(null);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    grado_seccion_id: "",
    sede_id: "",
    periodo_academico: "",
    plan_pago_id: "",
  });

  const { data: matriculas, isLoading } = useQuery({
    queryKey: ["matriculas"],
    queryFn: async () => {

      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("matriculas")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni),
          grados_secciones(grado, seccion, nivel),
          sedes(nombre, ciudad),
          planes_pago(nombre, total, pagado, restante)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-list"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("estudiantes", {
        filtros: { estado: "activo" }
      });
      return data || [];
    },
  });

  const { data: gradosSecciones } = useQuery({
    queryKey: ["grados-secciones"],
    queryFn: async () => {

      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("grados_secciones")
        .select("*, sedes(nombre)")
        .eq("activo", true);
      if (error) {
        console.error("Error loading grados_secciones:", error);
        throw error;
      }
      return data || [];
    },
  });

  const { data: sedes } = useQuery({
    queryKey: ["sedes-list"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("sedes", {
        filtros: { activo: true }
      });
      return data || [];
    },
  });

  const { data: ciclos } = useQuery({
    queryKey: ["ciclos-list"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("ciclos_academicos", {
        filtros: { activo: true }
      });
      return data || [];
    },
  });

  const { data: planesPago } = useQuery({
    queryKey: ["planes-disponibles"],
    queryFn: async () => {

      const cliente = supabaseFailover.getDirectClient();
      const { data } = await cliente
        .from("planes_pago")
        .select("*, estudiantes(nombres, apellidos)")
        .eq("activo", true);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newMatricula: typeof formData) => {

      const cliente = supabaseFailover.getDirectClient();
      const { data: cursoData, error: cursoError } = await cliente
        .from("cursos")
        .select("id")
        .limit(1)
        .maybeSingle();

      let cursoId = (cursoData as any)?.id;


      if (!cursoId) {
        const { data: nuevoCurso, error: errorNuevoCurso } = await supabaseFailover.insertSingle("cursos", {
          nombre: "Curso General",
          codigo: "GEN-001",
          descripcion: "Curso general por defecto",
          sede_id: newMatricula.sede_id,
        });

        if (errorNuevoCurso) throw errorNuevoCurso;
        cursoId = nuevoCurso.id;
      }


      const { data: matriculaData, error: matriculaError } = await supabaseFailover.insertSingle("matriculas", {
        estudiante_id: newMatricula.estudiante_id,
        curso_id: cursoId,
        grado_seccion_id: newMatricula.grado_seccion_id,
        sede_id: newMatricula.sede_id,
        periodo_academico: newMatricula.periodo_academico,
        plan_pago_id: newMatricula.plan_pago_id || null,
      });

      if (matriculaError) throw matriculaError;

      return {
        success: true,
        matricula_id: matriculaData.id,
        message: "Matrícula registrada exitosamente"
      };
    },
    onSuccess: async (data: any, variables) => {
      if (data.success) {

        await logCreate('matriculas', 'Matrícula', (data as any)?.matricula_id, variables);

        queryClient.invalidateQueries({ queryKey: ["matriculas"] });
        toast.success(data.message);
        setOpen(false);
        setFormData({
          estudiante_id: "",
          grado_seccion_id: "",
          sede_id: "",
          periodo_academico: "",
          plan_pago_id: "",
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log(` Iniciando eliminación de matrícula ${id}...`);

      // 1. Eliminar estado académico
      const { error: estadoError } = await supabaseFailover.delete("estado_academico", id);
      if (estadoError) {
        console.error(`❌ Error eliminando estado académico:`, estadoError);
        throw estadoError;
      }
      console.log(`Estado académico eliminado`);

      // 2. Eliminar evaluaciones relacionadas (buscar por matricula_id)
      console.log(`🔍 Buscando evaluaciones relacionadas...`);
      const cliente = supabaseFailover.getDirectClient();
      const { data: evaluaciones, error: evalQueryError } = await cliente
        .from("evaluaciones")
        .select("id")
        .eq("matricula_id", id);

      if (evalQueryError) {
        console.error(`❌ Error buscando evaluaciones:`, evalQueryError);
        throw evalQueryError;
      }

      if (evaluaciones && evaluaciones.length > 0) {
        console.log(`✂️ Eliminando ${evaluaciones.length} evaluaciones...`);
        for (const evaluacion of evaluaciones) {
          const { error: evalError } = await supabaseFailover.delete("evaluaciones", evaluacion.id);
          if (evalError) {
            console.error(`❌ Error eliminando evaluación ${evaluacion.id}:`, evalError);
            throw evalError;
          }
        }
        console.log(`${evaluaciones.length} evaluaciones eliminadas`);
      } else {
        console.log(`ℹ️ No se encontraron evaluaciones para esta matrícula`);
      }

      // 3. Eliminar la matrícula
      console.log(`✂️ Eliminando matrícula ${id}...`);
      const { error } = await supabaseFailover.delete("matriculas", id);
      if (error) {
        console.error(`❌ Error eliminando matrícula:`, error);
        throw error;
      }
      console.log(`Matrícula ${id} eliminada exitosamente`);
    },
    onSuccess: async (_, matriculaId) => {

      await logDelete('matriculas', 'Matrícula', matriculaId as string, {});

      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast.success("Matrícula eliminada exitosamente");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {

      const cliente = supabaseFailover.getDirectClient();
      const { data: cursoData } = await cliente
        .from("cursos")
        .select("id")
        .limit(1)
        .maybeSingle();

      let cursoId = (cursoData as any)?.id;

      if (!cursoId) {
        const { data: nuevoCurso, error: errorNuevoCurso } = await supabaseFailover.insertSingle("cursos", {
          nombre: "Curso General",
          codigo: "GEN-001",
          descripcion: "Curso general por defecto",
          sede_id: data.sede_id,
        });

        if (errorNuevoCurso) throw errorNuevoCurso;
        cursoId = nuevoCurso.id;
      }


      const { error } = await supabaseFailover.update("matriculas", id, {
        estudiante_id: data.estudiante_id,
        curso_id: cursoId,
        grado_seccion_id: data.grado_seccion_id,
        sede_id: data.sede_id,
        periodo_academico: data.periodo_academico,
        plan_pago_id: data.plan_pago_id || null,
      });

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {

      await logUpdate('matriculas', 'Matrícula', variables.id, {}, variables.data);

      queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      toast.success("Matrícula actualizada exitosamente");
      setEditOpen(false);
      setSelectedMatricula(null);
      setFormData({
        estudiante_id: "",
        grado_seccion_id: "",
        sede_id: "",
        periodo_academico: "",
        plan_pago_id: "",
      });
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMatricula) {
      updateMutation.mutate({ id: selectedMatricula.id, data: formData });
    }
  };

  const handleEdit = (matricula: any) => {
    setSelectedMatricula(matricula);
    setFormData({
      estudiante_id: matricula.estudiante_id,
      grado_seccion_id: matricula.grado_seccion_id,
      sede_id: matricula.sede_id,
      periodo_academico: matricula.periodo_academico,
      plan_pago_id: matricula.plan_pago_id || "",
    });
    setEditOpen(true);
  };

  const verPlanPago = async (planId: string) => {

    const cliente = supabaseFailover.getDirectClient();
    const { data } = await cliente
      .from("planes_pago")
      .select(`
        *,
        cuotas_pago(*),
        estudiantes(nombres, apellidos)
      `)
      .eq("id", planId)
      .single();

    if (data) {
      setSelectedPlan(data);
      setViewOpen(true);
    }
  };

  const verDetalleMatricula = (matricula: any) => {
    setSelectedMatricula(matricula);
    setViewMatriculaOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-indigo-600 rounded-full" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Matrículas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Gestión de inscripciones y seguimiento académico
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 px-6">
              <BookOpen className="mr-2 h-4 w-4" />
              Nueva Matrícula
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Matrícula</DialogTitle>
              <DialogDescription>
                Complete los datos de matrícula
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estudiante">Estudiante</Label>
                <Select
                  value={formData.estudiante_id}
                  onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {(estudiantes as any[])?.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.nombres} {est.apellidos} - DNI: {est.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grado">Grado y Sección</Label>
                <Select
                  value={formData.grado_seccion_id}
                  onValueChange={(value) => setFormData({ ...formData, grado_seccion_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione grado y sección" />
                  </SelectTrigger>
                  <SelectContent>
                    {(gradosSecciones as any[])?.map((gs) => (
                      <SelectItem key={gs.id} value={gs.id}>
                        {gs.nivel} - {gs.grado} "{gs.seccion}"
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sede">Sede</Label>
                <Select
                  value={formData.sede_id}
                  onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sedes as any[])?.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.nombre} - {sede.ciudad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo">Periodo Académico</Label>
                <Select
                  value={formData.periodo_academico}
                  onValueChange={(value) => setFormData({ ...formData, periodo_academico: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ciclos as any[])?.map((ciclo) => (
                      <SelectItem key={ciclo.id} value={ciclo.nombre}>
                        {ciclo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan de Pago (Opcional)</Label>
                <Select
                  value={formData.plan_pago_id}
                  onValueChange={(value) => setFormData({ ...formData, plan_pago_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {(planesPago as any[])?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre} - {plan.estudiantes?.nombres} {plan.estudiantes?.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Procesando..." : "Matricular"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-none shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Matrículas</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(matriculas as any[])?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Matrículas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(matriculas as any[])?.map((matricula) => (
            <Card key={matricula.id} className="group bg-white dark:bg-slate-900 border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardContent className="p-6 space-y-6">
                {/* Header Card */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        {matricula.estudiantes?.nombres?.charAt(0)}{matricula.estudiantes?.apellidos?.charAt(0)}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                        {matricula.estudiantes?.nombres} {matricula.estudiantes?.apellidos}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 pl-10">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                        DNI: {matricula.estudiantes?.dni}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      onClick={() => handleEdit(matricula)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      onClick={() => {
                        if (confirm("¿Está seguro de eliminar esta matrícula? Se eliminarán también las evaluaciones y el estado académico asociado.")) {
                          deleteMutation.mutate(matricula.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Grado</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {matricula.grados_secciones?.grado} "{matricula.grados_secciones?.seccion}"
                    </p>
                    <p className="text-xs text-slate-400">{matricula.grados_secciones?.nivel}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Sede</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {matricula.sedes?.nombre}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{matricula.sedes?.ciudad}</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${matricula.estado === "activa"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                      {matricula.estado}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {matricula.periodo_academico}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {matricula.plan_pago_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        onClick={() => verPlanPago(matricula.plan_pago_id!)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Plan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:border-indigo-900 dark:hover:bg-indigo-900/20 transition-colors"
                      onClick={() => verDetalleMatricula(matricula)}
                    >
                      Detalles
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para ver detalle de matrícula */}
      <Dialog open={viewMatriculaOpen} onOpenChange={setViewMatriculaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Matrícula</DialogTitle>
          </DialogHeader>
          {selectedMatricula && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Estudiante:</span>
                  <span>{selectedMatricula.estudiantes?.nombres} {selectedMatricula.estudiantes?.apellidos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">DNI:</span>
                  <span>{selectedMatricula.estudiantes?.dni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Grado y Sección:</span>
                  <span>{selectedMatricula.grados_secciones?.nivel} - {selectedMatricula.grados_secciones?.grado} "{selectedMatricula.grados_secciones?.seccion}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sede:</span>
                  <span>{selectedMatricula.sedes?.nombre} - {selectedMatricula.sedes?.ciudad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Periodo Académico:</span>
                  <span>{selectedMatricula.periodo_academico}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Fecha de Matrícula:</span>
                  <span>{selectedMatricula.fecha_matricula ? new Date(selectedMatricula.fecha_matricula).toLocaleDateString("es-PE") : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${selectedMatricula.estado === "activa"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                    {selectedMatricula.estado}
                  </span>
                </div>
                {selectedMatricula.plan_pago_id && (
                  <div className="flex justify-between">
                    <span className="font-medium">Plan de Pago:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        verPlanPago(selectedMatricula.plan_pago_id!);
                        setViewMatriculaOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Plan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar matrícula */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Matrícula</DialogTitle>
            <DialogDescription>
              Modifique los datos de la matrícula
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estudiante-edit">Estudiante</Label>
              <Select
                value={formData.estudiante_id}
                onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {(estudiantes as any[])?.map((est) => (
                    <SelectItem key={est.id} value={est.id}>
                      {est.nombres} {est.apellidos} - DNI: {est.dni}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grado-edit">Grado y Sección</Label>
              <Select
                value={formData.grado_seccion_id}
                onValueChange={(value) => setFormData({ ...formData, grado_seccion_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione grado y sección" />
                </SelectTrigger>
                <SelectContent>
                  {(gradosSecciones as any[])?.map((gs) => (
                    <SelectItem key={gs.id} value={gs.id}>
                      {gs.nivel} - {gs.grado} "{gs.seccion}"
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sede-edit">Sede</Label>
              <Select
                value={formData.sede_id}
                onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione sede" />
                </SelectTrigger>
                <SelectContent>
                  {(sedes as any[])?.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre} - {sede.ciudad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodo-edit">Periodo Académico</Label>
              <Select
                value={formData.periodo_academico}
                onValueChange={(value) => setFormData({ ...formData, periodo_academico: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione periodo" />
                </SelectTrigger>
                <SelectContent>
                  {(ciclos as any[])?.map((ciclo) => (
                    <SelectItem key={ciclo.id} value={ciclo.nombre}>
                      {ciclo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-edit">Plan de Pago (Opcional)</Label>
              <Select
                value={formData.plan_pago_id}
                onValueChange={(value) => setFormData({ ...formData, plan_pago_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione plan" />
                </SelectTrigger>
                <SelectContent>
                  {(planesPago as any[])?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre} - {plan.estudiantes?.nombres} {plan.estudiantes?.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Matrícula"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver plan de pago */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan de Pago</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedPlan.nombre}</h3>
                <p className="text-sm">Estudiante: {selectedPlan.estudiantes?.nombres} {selectedPlan.estudiantes?.apellidos}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Cuotas</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPlan.cuotas_pago?.map((cuota: any) => (
                      <TableRow key={cuota.id}>
                        <TableCell>{cuota.numero_cuota}</TableCell>
                        <TableCell>{cuota.concepto}</TableCell>
                        <TableCell>S/ {Number(cuota.monto).toFixed(2)}</TableCell>
                        <TableCell>
                          {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${cuota.estado === "pagado"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : cuota.estado === "vencido"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                            {cuota.estado}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">S/ {Number(selectedPlan.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Pagado:</span>
                  <span>S/ {Number(selectedPlan.pagado).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Restante:</span>
                  <span>S/ {Number(selectedPlan.restante).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Matriculas;