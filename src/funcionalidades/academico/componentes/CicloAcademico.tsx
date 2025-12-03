"use client";

import React, { useState, useEffect } from "react";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { useActivityLogger } from "@/ganchos/useActivityLogger";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Badge } from "@/componentes/ui/badge";
import { Calendar } from "@/componentes/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/ui/popover";
import { Plus, Pencil, Trash2, CalendarIcon, DoorOpen, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/utilidades/utils";

interface CicloAcademico {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Salon {
  id: string;
  nombre: string;
  codigo: string;
  nivel: string;
  grado: string;
  seccion: string;
  capacidad: number;
  profesores?: { nombres: string; apellidos: string };
}

export function CicloAcademico() {
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [ciclos, setCiclos] = useState<CicloAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salonesDialogOpen, setSalonesDialogOpen] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState<CicloAcademico | null>(null);
  const [selectedCiclo, setSelectedCiclo] = useState<CicloAcademico | null>(null);
  const [salones, setSalones] = useState<Salon[]>([]);
  const [salonesDisponibles, setSalonesDisponibles] = useState<Salon[]>([]);

  const [formData, setFormData] = useState({
    nombre: "",
    fecha_inicio: new Date(),
    fecha_fin: new Date(new Date().setMonth(new Date().getMonth() + 6)),
    activo: true,
  });

  useEffect(() => {
    // Solo cargar datos en el cliente, no en el servidor
    if (typeof window !== 'undefined') {
      loadCiclos();
    }
  }, []);

  const loadCiclos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseFailover.select("ciclos_academicos", {
        orden: { campo: "fecha_inicio", ascendente: false }
      });

      if (error) throw error;
      setCiclos(data || []);
    } catch (error) {
      console.error("Error loading ciclos:", error);
      toast.error("Error al cargar ciclos académicos");
    } finally {
      setLoading(false);
    }
  };

  const loadSalones = async (cicloId: string) => {
    try {
      // Nota: Esta operación con JOIN requiere cliente directo
      // TODO: Extender supabaseFailover para soportar JOINs
      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("salones")
        .select("*, profesores(nombres, apellidos)")
        .eq("ciclo_academico_id", cicloId)
        .eq("activo", true);

      if (error) throw error;
      setSalones(data || []);
    } catch (error) {
      console.error("Error loading salones:", error);
      toast.error("Error al cargar salones");
    }
  };

  const loadSalonesDisponibles = async () => {
    try {
      // Nota: Esta operación con JOIN requiere cliente directo
      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("salones")
        .select("*, profesores(nombres, apellidos)")
        .is("ciclo_academico_id", null)
        .eq("activo", true);

      if (error) throw error;
      setSalonesDisponibles(data || []);
    } catch (error) {
      console.error("Error loading salones disponibles:", error);
      toast.error("Error al cargar salones disponibles");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true); // Deshabilitar botón durante el guardado

      const dataToSave = {
        nombre: formData.nombre,
        fecha_inicio: format(formData.fecha_inicio, "yyyy-MM-dd"),
        fecha_fin: format(formData.fecha_fin, "yyyy-MM-dd"),
        activo: formData.activo,
      };

      if (editingCiclo) {
        const { data, error } = await supabaseFailover.update(
          "ciclos_academicos",
          editingCiclo.id,
          dataToSave
        );

        if (error) throw error;

        // Logging
        await logUpdate(
          'ciclos',
          'Ciclo Académico',
          editingCiclo.id,
          editingCiclo,
          { ...editingCiclo, ...dataToSave }
        );

        toast.success("Ciclo académico actualizado exitosamente");
      } else {
        const { data, error } = await supabaseFailover.insert(
          "ciclos_academicos",
          dataToSave
        );

        if (error) throw error;

        // Logging
        if (data && data.length > 0) {
          await logCreate(
            'ciclos',
            'Ciclo Académico',
            data[0].id,
            data[0]
          );
        }

        toast.success("Ciclo académico creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadCiclos();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al guardar ciclo académico");
    } finally {
      setLoading(false); // Re-habilitar botón
    }
  };

  const handleEdit = (ciclo: CicloAcademico) => {
    setEditingCiclo(ciclo);
    setFormData({
      nombre: ciclo.nombre,
      fecha_inicio: new Date(ciclo.fecha_inicio),
      fecha_fin: new Date(ciclo.fecha_fin),
      activo: ciclo.activo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (ciclo: CicloAcademico) => {
    if (!confirm("¿Estás seguro de eliminar este ciclo académico? Esto desvinculará todos los salones y eliminará todos los planes de pago asociados.")) return;

    try {
      setLoading(true);
      const supabase = supabaseFailover.getDirectClient();
      let deletedCounts = {
        salones: 0,
        planes: 0,
        cuotas: 0,
        pagos: 0
      };

      // 1. Eliminar planes de pago asociados al ciclo (y sus cuotas y pagos)
      const { data: planes } = await supabase
        .from("planes_pago")
        .select("id")
        .eq("ciclo_academico_id", ciclo.id);

      if (planes && planes.length > 0) {
        console.log(`Eliminando ${planes.length} planes de pago del ciclo...`);

        for (const plan of planes) {
          // Eliminar pagos del plan
          const { data: pagos } = await supabase
            .from("pagos")
            .select("id")
            .eq("plan_pago_id", plan.id);

          if (pagos && pagos.length > 0) {
            for (const pago of pagos) {
              await supabaseFailover.delete("pagos", pago.id);
            }
            deletedCounts.pagos += pagos.length;
          }

          // Eliminar cuotas del plan
          const { data: cuotas } = await supabase
            .from("cuotas_pago")
            .select("id")
            .eq("plan_pago_id", plan.id);

          if (cuotas && cuotas.length > 0) {
            for (const cuota of cuotas) {
              await supabaseFailover.delete("cuotas_pago", cuota.id);
            }
            deletedCounts.cuotas += cuotas.length;
          }

          // Eliminar el plan
          await supabaseFailover.delete("planes_pago", plan.id);
        }
        deletedCounts.planes = planes.length;
      }

      // 2. Desvincular todos los salones asociados a este ciclo
      const { data: salonesAsociados } = await supabase
        .from("salones")
        .select("id")
        .eq("ciclo_academico_id", ciclo.id);

      if (salonesAsociados && salonesAsociados.length > 0) {
        console.log(`Desvinculando ${salonesAsociados.length} salones del ciclo...`);

        // Desvincular salones (setear ciclo_academico_id a null)
        for (const salon of salonesAsociados) {
          await supabaseFailover.update("salones", salon.id, {
            ciclo_academico_id: null
          });
        }

        deletedCounts.salones = salonesAsociados.length;
      }

      // 3. Ahora sí eliminar el ciclo académico
      const { error } = await supabaseFailover.delete(
        "ciclos_academicos",
        ciclo.id
      );

      if (error) throw error;

      // Logging
      await logDelete(
        'ciclos',
        'Ciclo Académico',
        ciclo.id,
        ciclo
      );

      const total = deletedCounts.planes + deletedCounts.cuotas + deletedCounts.pagos + deletedCounts.salones;
      toast.success(`Ciclo académico eliminado (${total} registros relacionados procesados)`);
      loadCiclos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar ciclo académico");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSalones = async (ciclo: CicloAcademico) => {
    setSelectedCiclo(ciclo);
    await loadSalones(ciclo.id);
    await loadSalonesDisponibles();
    setSalonesDialogOpen(true);
  };

  const handleAsignarSalon = async (salonId: string) => {
    if (!selectedCiclo) return;

    try {
      const { error } = await supabaseFailover.update(
        "salones",
        salonId,
        { ciclo_academico_id: selectedCiclo.id }
      );

      if (error) throw error;
      toast.success("Salón asignado al ciclo académico");
      await loadSalones(selectedCiclo.id);
      await loadSalonesDisponibles();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al asignar salón");
    }
  };

  const handleRemoverSalon = async (salonId: string) => {
    if (!selectedCiclo) return;

    try {
      const { error } = await supabaseFailover.update(
        "salones",
        salonId,
        { ciclo_academico_id: null }
      );

      if (error) throw error;
      toast.success("Salón removido del ciclo académico");
      await loadSalones(selectedCiclo.id);
      await loadSalonesDisponibles();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al remover salón");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      fecha_inicio: new Date(),
      fecha_fin: new Date(new Date().setMonth(new Date().getMonth() + 6)),
      activo: true,
    });
    setEditingCiclo(null);
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
              Ciclos Académicos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Planificación de periodos y asignación de recursos
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
                Nuevo Ciclo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingCiclo ? "Editar Ciclo Académico" : "Crear Nuevo Ciclo Académico"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-foreground">Nombre del Ciclo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Ciclo 2024-I"
                    required
                    className="bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Fecha de Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background text-foreground",
                          !formData.fecha_inicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_inicio ? (
                          format(formData.fecha_inicio, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_inicio}
                        onSelect={(date) => date && setFormData({ ...formData, fecha_inicio: date })}
                        initialFocus
                        className="pointer-events-auto bg-background text-foreground"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Fecha de Fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background text-foreground",
                          !formData.fecha_fin && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_fin ? (
                          format(formData.fecha_fin, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_fin}
                        onSelect={(date) => date && setFormData({ ...formData, fecha_fin: date })}
                        initialFocus
                        className="pointer-events-auto bg-background text-foreground"
                      />
                    </PopoverContent>
                  </Popover>
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
                    {loading ? "Guardando..." : (editingCiclo ? "Actualizar" : "Crear")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ciclos.map((ciclo) => (
          <Card key={ciclo.id} className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col">
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {ciclo.nombre}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={ciclo.activo ? "default" : "secondary"} className={ciclo.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "bg-slate-100 text-slate-500"}>
                    {ciclo.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={() => handleOpenSalones(ciclo)}
                  title="Gestionar Salones"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => handleEdit(ciclo)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDelete(ciclo)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Inicio</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3 text-indigo-500" />
                    {format(new Date(ciclo.fecha_inicio), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fin</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3 text-rose-500" />
                    {format(new Date(ciclo.fecha_fin), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ciclos.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No hay ciclos académicos</h3>
            <p className="text-slate-500 max-w-sm mt-2 mb-6">
              Comience creando los periodos académicos para organizar sus clases.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Ciclo
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={salonesDialogOpen} onOpenChange={setSalonesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Gestionar Salones - <span className="text-indigo-600">{selectedCiclo?.nombre}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                Salones Asignados
              </h3>
              {salones.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-500">
                  No hay salones asignados a este ciclo
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {salones.map((salon) => (
                    <Card key={salon.id} className="border-l-4 border-l-indigo-500 shadow-sm">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <DoorOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {salon.nombre || `${salon.nivel} - ${salon.grado} ${salon.seccion}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              Cap: {salon.capacidad} | {salon.profesores ? `${salon.profesores.nombres} ${salon.profesores.apellidos}` : "Sin profesor"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleRemoverSalon(salon.id)}
                        >
                          Remover
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <div className="w-2 h-6 bg-slate-300 rounded-full" />
                Salones Disponibles
              </h3>
              {salonesDisponibles.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-500">
                  No hay salones disponibles para asignar
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {salonesDisponibles.map((salon) => (
                    <Card key={salon.id} className="border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <DoorOpen className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {salon.nombre || `${salon.nivel} - ${salon.grado} ${salon.seccion}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              Cap: {salon.capacidad}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                          onClick={() => handleAsignarSalon(salon.id)}
                        >
                          Asignar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}