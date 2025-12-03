"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/ui/popover";
import { Calendar } from "@/componentes/ui/calendar";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { UserCheck, Plus, Eye, Edit, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/ganchos/use-toast";
import { useAuth } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import { activityLogger } from "@/servicios/logger/registroActividad";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utils";

const Profesores = () => {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProfesor, setSelectedProfesor] = useState<any>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date>();

  const [formData, setFormData] = useState({
    sede_id: "",
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    especialidad: "",
    sexo: "",
    edad: "",
    fecha_nacimiento: "",
  });

  const { data: profesores, isLoading } = useQuery({
    queryKey: ["profesores"],
    queryFn: async () => {
      const { data, error } = await supabaseFailover.select("profesores");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: sedes, isLoading: isLoadingSedes, error: sedesError } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data, error } = await supabaseFailover.select("sedes", {
        filtros: { activo: true }
      });
      if (error) {
        console.error("Error cargando sedes:", error);
        throw error;
      }
      console.log("Sedes cargadas:", data);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    console.log("Estado de sedes:", { sedes, isLoadingSedes, sedesError });
  }, [sedes, isLoadingSedes, sedesError]);

  const createProfesor = useMutation({
    mutationFn: async (newProfesor: any) => {
      const { data, error } = await supabaseFailover.insert("profesores", newProfesor);
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      toast({ title: "Profesor registrado exitosamente" });

      if (user && data && data[0]) {
        await activityLogger.logCreate(
          user.id,
          user.email || 'sin-email',
          role || 'desconocido',
          'profesores',
          'profesor',
          data[0].id,
          data[0]
        );
      }

      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error al registrar profesor", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...datos }: any) => {
      const { data, error } = await supabaseFailover.update("profesores", id, datos);
      if (error) throw error;
      return { id, data: datos };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      toast({ title: "Profesor actualizado exitosamente" });

      if (user && selectedProfesor) {
        await activityLogger.logUpdate(
          user.id,
          user.email || 'sin-email',
          role || 'desconocido',
          'profesores',
          'profesor',
          result.id,
          selectedProfesor,
          result.data
        );
      }

      setEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, profesorData }: { id: string; profesorData: any }) => {
      const supabase = supabaseFailover.getDirectClient();
      let deletedCounts = {
        salones: 0,
        salonCursos: 0
      };

      // 1. Desvincular salones (profesor_id = null)
      const { data: salones } = await supabase
        .from("salones")
        .select("id")
        .eq("profesor_id", id);

      if (salones && salones.length > 0) {
        console.log(`Desvinculando ${salones.length} salones del profesor...`);
        for (const salon of salones) {
          await supabaseFailover.update("salones", salon.id, {
            profesor_id: null
          });
        }
        deletedCounts.salones = salones.length;
      }

      // 2. Desvincular salon_cursos (profesor_id = null)
      const { data: salonCursos } = await supabase
        .from("salon_cursos")
        .select("id")
        .eq("profesor_id", id);

      if (salonCursos && salonCursos.length > 0) {
        console.log(`Desvinculando ${salonCursos.length} asignaciones de cursos...`);
        for (const sc of salonCursos) {
          await supabaseFailover.update("salon_cursos", sc.id, {
            profesor_id: null
          });
        }
        deletedCounts.salonCursos = salonCursos.length;
      }

      // 3. Eliminar el profesor
      const { error } = await supabaseFailover.delete("profesores", id);
      if (error) throw error;

      return { id, profesorData, deletedCounts };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["profesores"] });
      const total = result.deletedCounts.salones + result.deletedCounts.salonCursos;
      toast({ title: `Profesor eliminado (${total} asignaciones desvinculadas)` });

      if (user) {
        await activityLogger.logDelete(
          user.id,
          user.email || 'sin-email',
          role || 'desconocido',
          'profesores',
          'profesor',
          result.id,
          result.profesorData
        );
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      sede_id: "",
      dni: "",
      nombres: "",
      apellidos: "",
      email: "",
      telefono: "",
      direccion: "",
      especialidad: "",
      sexo: "",
      edad: "",
      fecha_nacimiento: "",
    });
    setFechaNacimiento(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
    };
    createProfesor.mutate(dataToSubmit);
  };

  const handleEdit = (profesor: any) => {
    setSelectedProfesor(profesor);
    setFormData({
      sede_id: profesor.sede_id || "",
      dni: profesor.dni || "",
      nombres: profesor.nombres || "",
      apellidos: profesor.apellidos || "",
      email: profesor.email || "",
      telefono: profesor.telefono || "",
      direccion: profesor.direccion || "",
      especialidad: profesor.especialidad || "",
      sexo: profesor.sexo || "",
      edad: profesor.edad?.toString() || "",
      fecha_nacimiento: profesor.fecha_nacimiento || "",
    });
    if (profesor.fecha_nacimiento) {
      setFechaNacimiento(new Date(profesor.fecha_nacimiento));
    }
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfesor) {
      toast({
        title: "Error",
        description: "No se ha seleccionado un profesor",
        variant: "destructive"
      });
      return;
    }
    const dataToUpdate = {
      id: selectedProfesor.id,
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
    };
    updateMutation.mutate(dataToUpdate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Profesores
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gestión de docentes del sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Profesor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Registrar Nuevo Profesor</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Complete los datos del profesor
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sede" className="text-foreground">Sede</Label>
                    <Select
                      value={formData.sede_id}
                      onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder={isLoadingSedes ? "Cargando..." : "Seleccione sede"} />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="z-[9999] bg-popover text-popover-foreground border-border"
                      >
                        {isLoadingSedes ? (
                          <SelectItem value="loading" disabled>
                            Cargando sedes...
                          </SelectItem>
                        ) : !sedes || sedes.length === 0 ? (
                          <SelectItem value="no-sedes" disabled>
                            No hay sedes disponibles
                          </SelectItem>
                        ) : (
                          sedes.map((sede: any) => (
                            <SelectItem
                              key={sede.id}
                              value={sede.id}
                              className="cursor-pointer hover:bg-accent"
                            >
                              {sede.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dni" className="text-foreground">DNI</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      required
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombres" className="text-foreground">Nombres</Label>
                    <Input
                      id="nombres"
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      required
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellidos" className="text-foreground">Apellidos</Label>
                    <Input
                      id="apellidos"
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      required
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexo" className="text-foreground">Sexo</Label>
                    <Select
                      value={formData.sexo}
                      onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="z-[9999] bg-popover text-popover-foreground border-border"
                      >
                        <SelectItem value="MASCULINO" className="cursor-pointer hover:bg-accent">
                          MASCULINO
                        </SelectItem>
                        <SelectItem value="FEMENINO" className="cursor-pointer hover:bg-accent">
                          FEMENINO
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edad" className="text-foreground">Edad</Label>
                    <Input
                      id="edad"
                      type="number"
                      value={formData.edad}
                      onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Fecha de Nacimiento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background text-foreground",
                            !fechaNacimiento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fechaNacimiento ? format(fechaNacimiento, "PPP", { locale: es }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="single"
                          selected={fechaNacimiento}
                          onSelect={setFechaNacimiento}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={es}
                          className="rounded-md border-border"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-foreground">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="direccion" className="text-foreground">Dirección</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="especialidad" className="text-foreground">Especialidad</Label>
                    <Input
                      id="especialidad"
                      value={formData.especialidad}
                      onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createProfesor.isPending}>
                  {createProfesor.isPending ? "Registrando..." : "Registrar Profesor"}
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
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Profesores</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(profesores as any[])?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Directorio Docente
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Cargando profesores...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">DNI</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nombres</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Apellidos</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Especialidad</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profesores as any[])?.map((profesor) => {
                  const sede = (sedes as any[])?.find((s) => s.id === profesor.sede_id);
                  return (
                    <TableRow key={profesor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">{profesor.dni}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{profesor.nombres}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{profesor.apellidos}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{profesor.especialidad || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profesor.estado === "activo"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                          {profesor.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            onClick={() => {
                              setSelectedProfesor(profesor);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            onClick={() => handleEdit(profesor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            onClick={() => {
                              if (confirm("¿Está seguro de eliminar este profesor?")) {
                                deleteMutation.mutate({ id: profesor.id, profesorData: profesor });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Profesor</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Actualice los datos del profesor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sede" className="text-foreground">Sede</Label>
                <Select
                  value={formData.sede_id}
                  onValueChange={(value) => setFormData({ ...formData, sede_id: value })}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder={isLoadingSedes ? "Cargando..." : "Seleccione sede"} />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="z-[9999] bg-popover text-popover-foreground border-border"
                  >
                    {isLoadingSedes ? (
                      <SelectItem value="loading" disabled>Cargando sedes...</SelectItem>
                    ) : sedes && sedes.length > 0 ? (
                      (sedes as any[])?.map((sede) => (
                        <SelectItem
                          key={sede.id}
                          value={sede.id}
                          className="cursor-pointer hover:bg-accent"
                        >
                          {sede.nombre}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sedes" disabled>No hay sedes disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dni" className="text-foreground">DNI</Label>
                <Input
                  id="edit-dni"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  required
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nombres" className="text-foreground">Nombres</Label>
                <Input
                  id="edit-nombres"
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  required
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-apellidos" className="text-foreground">Apellidos</Label>
                <Input
                  id="edit-apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  required
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sexo" className="text-foreground">Sexo</Label>
                <Select
                  value={formData.sexo}
                  onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="z-[9999] bg-popover text-popover-foreground border-border"
                  >
                    <SelectItem value="MASCULINO" className="cursor-pointer hover:bg-accent">
                      MASCULINO
                    </SelectItem>
                    <SelectItem value="FEMENINO" className="cursor-pointer hover:bg-accent">
                      FEMENINO
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-edad" className="text-foreground">Edad</Label>
                <Input
                  id="edit-edad"
                  type="number"
                  value={formData.edad}
                  onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Fecha de Nacimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background text-foreground",
                        !fechaNacimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaNacimiento ? format(fechaNacimiento, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaNacimiento}
                      onSelect={setFechaNacimiento}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      locale={es}
                      className="rounded-md border-border"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-foreground">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefono" className="text-foreground">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-direccion" className="text-foreground">Dirección</Label>
                <Input
                  id="edit-direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-especialidad" className="text-foreground">Especialidad</Label>
                <Input
                  id="edit-especialidad"
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Profesor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Información del Profesor</DialogTitle>
          </DialogHeader>
          {selectedProfesor && (
            <div className="space-y-2 text-sm text-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>DNI:</strong> {selectedProfesor.dni}</div>
                <div><strong>Nombres:</strong> {selectedProfesor.nombres}</div>
                <div><strong>Apellidos:</strong> {selectedProfesor.apellidos}</div>
                <div><strong>Sexo:</strong> {selectedProfesor.sexo || "N/A"}</div>
                <div><strong>Edad:</strong> {selectedProfesor.edad || "N/A"}</div>
                <div><strong>Fecha Nacimiento:</strong> {selectedProfesor.fecha_nacimiento || "N/A"}</div>
                <div><strong>Email:</strong> {selectedProfesor.email || "N/A"}</div>
                <div><strong>Teléfono:</strong> {selectedProfesor.telefono || "N/A"}</div>
                <div className="col-span-2"><strong>Dirección:</strong> {selectedProfesor.direccion || "N/A"}</div>
                <div className="col-span-2"><strong>Especialidad:</strong> {selectedProfesor.especialidad || "N/A"}</div>
                <div><strong>Sede:</strong>                  {(sedes as any[])?.find((s) => s.id === selectedProfesor.sede_id)?.nombre || "N/A"}</div>
                <div><strong>Estado:</strong> {selectedProfesor.estado}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profesores;