import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { Calendar } from "@/componentes/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/ui/popover";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { toast } from "sonner";
import { Plus, Eye, Edit, Trash2, CalendarIcon, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utilidades/utils";


interface CuotaLocal {
  numero_cuota: number;
  concepto: string;
  monto: string; 
  fecha_vencimiento: Date | null;
}

interface PlanPago {
  id: number;
  nombre: string;
  descripcion?: string;
  monto_total: number;
  cuotas?: CuotaPago[];
}

interface CuotaPago {
  id: number;
  plan_pago_id: number;
  numero_cuota: number;
  concepto: string;
  monto: number;
  fecha_vencimiento: string;
}

const PlanesPago = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [cuotas, setCuotas] = useState<CuotaLocal[]>([]);


  const [formData, setFormData] = useState({
    nombre: "",
    ciclo_academico_id: "",
    nivel: "",
    estudiante_id: "",
  });

  const { data: planes, isLoading } = useQuery({
    queryKey: ["planes-pago"],
    queryFn: async () => {
      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("planes_pago")
        .select(`
          *,
          ciclos_academicos(nombre)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ciclos } = useQuery({
    queryKey: ["ciclos-activos"],
    queryFn: async () => {
      const cliente = supabaseFailover.getDirectClient();
      const { data } = await cliente
        .from("ciclos_academicos")
        .select("*")
        .eq("activo", true);
      return data || [];
    },
  });

  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-activos"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("estudiantes", {
        filtros: { estado: "activo" }
      });
      return data || [];
    },
  });


  const createPlanMutation = useMutation({
    mutationFn: async (newPlan: typeof formData) => {
      
      const payload = {
        nombre: newPlan.nombre,
        ciclo_academico_id: newPlan.ciclo_academico_id,
        nivel: newPlan.nivel,
        estudiante_id: newPlan.estudiante_id || null
      };

      const { data: planData, error: planError } = await supabaseFailover.insertSingle("planes_pago", payload);

      if (planError) throw planError;

      
      if (newPlan.estudiante_id) {
        const cliente = supabaseFailover.getDirectClient();

        const { data: matriculas, error: matError } = await cliente
          .from("matriculas")
          .select("id")
          .eq("estudiante_id", newPlan.estudiante_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (matError) {
          console.error("Error buscando matrícula:", matError);
        }

        if (matriculas && matriculas.length > 0) {
          const matriculaId = matriculas[0].id;
          const { error: updateError } = await supabaseFailover.update("matriculas", matriculaId, {
            plan_pago_id: planData.id
          });

          if (updateError) {
            console.error("Error vinculando plan a matrícula:", updateError);
            toast.error("El plan se creó pero hubo un error al vincularlo a la matrícula.");
          } else {
            if (!payload.estudiante_id) {
              await supabaseFailover.update("planes_pago", planData.id, {
                estudiante_id: newPlan.estudiante_id
              });
            }
          }
        } else {
          console.warn("No se encontró matrícula para el estudiante", newPlan.estudiante_id);
          toast.warning("El plan se creó pero el estudiante no tiene matrícula activa para vincular.");
        }
      }

      return planData;
    },
    onSuccess: (data) => {
      setSelectedPlan(data);
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      queryClient.invalidateQueries({ queryKey: ["planes-disponibles"] }); 
      toast.success("Plan de pago creado. Ahora agregue las cuotas.");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("¿Estás seguro de eliminar este plan? Se eliminarán todas las cuotas, pagos y se desvinculará de las matrículas.")) {
        throw new Error("Cancelado");
      }

      const supabase = supabaseFailover.getDirectClient();
      let deletedCounts = {
        cuotas: 0,
        pagos: 0,
        matriculas: 0
      };

      
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select("id")
        .eq("plan_pago_id", id);

      if (matriculas && matriculas.length > 0) {
        console.log(`Desvinculando ${matriculas.length} matrículas del plan...`);
        for (const matricula of matriculas) {
          await supabaseFailover.update("matriculas", matricula.id, {
            plan_pago_id: null
          });
        }
        deletedCounts.matriculas = matriculas.length;
      }

      
      const { data: cuotas } = await supabase
        .from("cuotas_pago")
        .select("id")
        .eq("plan_pago_id", id);

      if (cuotas && cuotas.length > 0) {
        console.log(`Eliminando ${cuotas.length} cuotas del plan...`);
        for (const cuota of cuotas) {
          await supabaseFailover.delete("cuotas_pago", cuota.id);
        }
        deletedCounts.cuotas = cuotas.length;
      }

      
      const { data: pagos } = await supabase
        .from("pagos")
        .select("id")
        .eq("plan_pago_id", id);

      if (pagos && pagos.length > 0) {
        console.log(`Eliminando ${pagos.length} pagos del plan...`);
        for (const pago of pagos) {
          await supabaseFailover.delete("pagos", pago.id);
        }
        deletedCounts.pagos = pagos.length;
      }

      
      const { error } = await supabaseFailover.delete("planes_pago", id);
      if (error) throw error;

      return deletedCounts;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      queryClient.invalidateQueries({ queryKey: ["planes-disponibles"] });
      const total = result.cuotas + result.pagos + result.matriculas;
      toast.success(`Plan eliminado (${total} registros relacionados procesados)`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPlanMutation.mutate(formData);
  };

  const agregarCuota = () => {
    setCuotas([...cuotas, {
      numero_cuota: cuotas.length + 1,
      concepto: "",
      monto: "",
      fecha_vencimiento: null,
    }]);
  };

  const actualizarCuota = (index: number, campo: string, valor: any) => {
    const nuevasCuotas = [...cuotas];
    nuevasCuotas[index] = { ...nuevasCuotas[index], [campo]: valor };
    setCuotas(nuevasCuotas);
  };

  const eliminarCuota = (index: number) => {
    setCuotas(cuotas.filter((_, i) => i !== index));
  };

  const guardarCuotas = async () => {
    if (!selectedPlan) return;

    try {
      
      const cuotasInvalidas = cuotas.filter(
        c => !c.concepto || !c.monto || !c.fecha_vencimiento
      );

      if (cuotasInvalidas.length > 0) {
        toast.error("Por favor complete todos los campos de las cuotas (concepto, monto y fecha de vencimiento)");
        return;
      }

      const cuotasParaGuardar = cuotas.map(c => ({
        plan_pago_id: selectedPlan.id,
        numero_cuota: c.numero_cuota,
        concepto: c.concepto,
        monto: parseFloat(c.monto),
        fecha_vencimiento: format(c.fecha_vencimiento!, "yyyy-MM-dd"),
        estado: "pendiente" as const, 
      }));

      console.log("Guardando cuotas para plan:", selectedPlan.id);
      console.log("Cuotas a guardar:", cuotasParaGuardar);

      const { error } = await supabaseFailover.insert("cuotas_pago", cuotasParaGuardar);

      if (error) throw error;

      toast.success("Cuotas guardadas exitosamente");
      setOpen(false);
      setCuotas([]);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      queryClient.invalidateQueries({ queryKey: ["planes-disponibles"] }); 
      queryClient.invalidateQueries({ queryKey: ["cuotas-disponibles"] });
      setFormData({
        nombre: "",
        ciclo_academico_id: "",
        nivel: "",
        estudiante_id: "",
      });
    } catch (error: any) {
      console.error("Error guardando cuotas:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const verDetallePlan = async (plan: any) => {
    const cliente = supabaseFailover.getDirectClient();
    const { data } = await cliente
      .from("cuotas_pago")
      .select("*")
      .eq("plan_pago_id", plan.id)
      .order("numero_cuota");

    setSelectedPlan({ ...plan, cuotas: data || [] });
    setViewOpen(true);
  };

  const total = cuotas.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Planes de Pago
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gestión de pensiones y cronogramas de pago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/30 transition-all duration-300">
                <CreditCard className="mr-2 h-4 w-4" />
                Nuevo Plan de Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">Crear Plan de Pago</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Configure el plan y luego agregue las cuotas
                </DialogDescription>
              </DialogHeader>

              {!selectedPlan ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-foreground">Nombre del Plan</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Plan de Pensiones 2025"
                      required
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estudiante" className="text-foreground">Asignar a Estudiante (Opcional)</Label>
                    <Select
                      value={formData.estudiante_id}
                      onValueChange={(value) => setFormData({ ...formData, estudiante_id: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccione estudiante" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {(estudiantes as any[])?.map((est) => (
                          <SelectItem key={est.id} value={est.id}>
                            {est.nombres} {est.apellidos} - DNI: {est.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Si selecciona un estudiante, el plan se vinculará automáticamente a su matrícula activa.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo" className="text-foreground">Ciclo Académico</Label>
                    <Select
                      value={formData.ciclo_academico_id}
                      onValueChange={(value) => setFormData({ ...formData, ciclo_academico_id: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccione ciclo" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {(ciclos as any[])?.map((ciclo) => (
                          <SelectItem key={ciclo.id} value={ciclo.id}>
                            {ciclo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel" className="text-foreground">Nivel</Label>
                    <Select
                      value={formData.nivel}
                      onValueChange={(value) => setFormData({ ...formData, nivel: value })}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccione nivel" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="INICIAL">INICIAL</SelectItem>
                        <SelectItem value="PRIMARIA">PRIMARIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                    Crear Plan
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                    <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">{formData.nombre}</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Nivel: {formData.nivel}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-foreground">Cuotas</h4>
                      <Button onClick={agregarCuota} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Cuota
                      </Button>
                    </div>

                    {cuotas.map((cuota, index) => (
                      <div key={index} className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg space-y-3 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground">Cuota #{cuota.numero_cuota}</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => eliminarCuota(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-foreground">Concepto <span className="text-red-500">*</span></Label>
                            <Input
                              value={cuota.concepto}
                              onChange={(e) => actualizarCuota(index, "concepto", e.target.value)}
                              placeholder="Ej: Pensión Marzo"
                              required
                              className="bg-background text-foreground"
                            />
                          </div>
                          <div>
                            <Label className="text-foreground">Monto (S/) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={cuota.monto}
                              onChange={(e) => actualizarCuota(index, "monto", e.target.value)}
                              required
                              className="bg-background text-foreground"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-foreground">Fecha de Vencimiento <span className="text-red-500">*</span></Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal bg-background text-foreground",
                                    !cuota.fecha_vencimiento && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {cuota.fecha_vencimiento ? format(cuota.fecha_vencimiento, "PPP") : "Seleccionar fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={cuota.fecha_vencimiento ?? undefined}
                                  onSelect={(date) => actualizarCuota(index, "fecha_vencimiento", date)}
                                  initialFocus
                                  className="pointer-events-auto bg-background text-foreground"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    ))}

                    {cuotas.length > 0 && (
                      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-foreground">Total del Plan:</span>
                          <span className="text-lg font-bold text-foreground">S/ {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400">Pagado:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">S/ 0.00</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-rose-600 dark:text-rose-400">Restante:</span>
                          <span className="text-rose-600 dark:text-rose-400">S/ {total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <Button onClick={guardarCuotas} className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={cuotas.length === 0}>
                      Guardar Plan y Cuotas
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Planes Activos</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(planes as any[])?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Listado de Planes
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Administre los planes de pago y sus cuotas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Cargando planes...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Ciclo</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nivel</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Total</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(planes as any[])?.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{plan.nombre}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{plan.ciclos_academicos?.nombre}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{plan.nivel}</TableCell>
                    <TableCell className="font-bold text-amber-600 dark:text-amber-400">S/ {Number(plan.total).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          onClick={() => verDetallePlan(plan)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          onClick={() => {
                            toast.info("Funcionalidad de editar en desarrollo");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={() => {
                            if (confirm("¿Eliminar este plan?")) {
                              deletePlanMutation.mutate(plan.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalle del Plan de Pago</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-100">{selectedPlan.nombre}</h3>
                <div className="flex gap-4 mt-2">
                  <p className="text-sm text-amber-700 dark:text-amber-300">Nivel: <span className="font-medium">{selectedPlan.nivel}</span></p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Ciclo: <span className="font-medium">{selectedPlan.ciclos_academicos?.nombre}</span></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Cuotas</h4>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-950">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase">N°</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase">Concepto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase">Monto</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase">Vencimiento</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlan.cuotas?.map((cuota: any) => (
                        <TableRow key={cuota.id}>
                          <TableCell className="font-medium">{cuota.numero_cuota}</TableCell>
                          <TableCell>{cuota.concepto}</TableCell>
                          <TableCell>S/ {Number(cuota.monto).toFixed(2)}</TableCell>
                          <TableCell>
                            {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cuota.estado === "pagado"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : cuota.estado === "vencido"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}>
                              {cuota.estado}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">S/ {Number(selectedPlan.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Pagado:</span>
                  <span>S/ {Number(selectedPlan.pagado).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
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

export default PlanesPago;