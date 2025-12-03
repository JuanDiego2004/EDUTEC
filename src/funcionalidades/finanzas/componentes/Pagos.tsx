"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { toast } from "sonner";
import { Eye, DollarSign, CreditCard, Users, ArrowLeft } from "lucide-react";

const Pagos = () => {
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<any>(null);

  const { data: planes, isLoading } = useQuery({
    queryKey: ["planes-con-estudiantes"],
    queryFn: async () => {
      
      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("planes_pago")
        .select(`
          *,
          ciclos_academicos(nombre)
        `)
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verEstudiantesPlan = async (plan: any) => {
    console.log(" Buscando estudiantes para plan:", plan.id, plan.nombre);

    
    const cliente = supabaseFailover.getDirectClient();

    
    const { data, error } = await cliente
      .from("matriculas")
      .select(`
        *,
        estudiantes(id, nombres, apellidos, dni)
      `)
      .eq("plan_pago_id", plan.id)
      .eq("estado", "activa");

    if (error) {
      console.error("Error cargando estudiantes:", error);
      toast.error("Error al cargar estudiantes del plan");
      return;
    }

    console.log(" Estudiantes encontrados:", data?.length || 0, data);

    if (!data || data.length === 0) {
      console.warn(" No hay estudiantes matriculados con este plan de pago");
      toast.info("No hay estudiantes matriculados con este plan. Los estudiantes deben estar matriculados primero.");
    }

    setSelectedPlan({ ...plan, estudiantes: data || [] });
    setViewOpen(true);
    setSelectedEstudiante(null);
  };

  const verPagosEstudiante = async (estudiante: any) => {
    
    const cliente = supabaseFailover.getDirectClient();
    const { data, error } = await cliente
      .from("cuotas_pago")
      .select("*")
      .eq("plan_pago_id", selectedPlan.id)
      .order("numero_cuota", { ascending: true });

    if (error) {
      console.error("Error loading cuotas:", error);
      toast.error("Error al cargar cuotas");
      return;
    }

    setSelectedEstudiante({ ...estudiante, cuotas: data || [] });
  };

  const cambiarEstadoMutation = useMutation({
    mutationFn: async ({ cuotaId, nuevoEstado, cuota }: { cuotaId: string; nuevoEstado: string; cuota?: any }) => {
      
      const { error } = await supabaseFailover.update("cuotas_pago", cuotaId, {
        estado: nuevoEstado,
        fecha_pago: nuevoEstado === "pagado" ? new Date().toISOString() : null,
      });

      if (error) throw error;

      
      if (nuevoEstado === "pagado" && cuota && selectedEstudiante) {
        
        const cliente = supabaseFailover.getDirectClient();
        const { data: estudiante } = await cliente
          .from("estudiantes")
          .select("sede_id")
          .eq("id", selectedEstudiante.estudiantes.id)
          .single();

        if (!estudiante?.sede_id) {
          console.error("No se encontró sede_id del estudiante");
          toast.error("Error: El estudiante no tiene sede asignada");
          return { success: false };
        }

        const pagoData = {
          estudiante_id: selectedEstudiante.estudiantes.id,
          sede_id: estudiante.sede_id,
          plan_pago_id: selectedPlan.id,
          monto: cuota.monto,
          concepto: cuota.concepto || `Pago de cuota ${cuota.numero_cuota}`,
          metodo_pago: "efectivo",
          estado: "completado",
          fecha_pago: new Date().toISOString()
        };

        console.log("💾 Registrando pago:", pagoData);
        const { error: pagoError } = await supabaseFailover.insertSingle("pagos", pagoData);
        if (pagoError) {
          console.error("Error registrando pago:", pagoError);
          toast.error("Estado actualizado pero el pago no se registró completamente");
        } else {
          console.log(" Pago registrado exitosamente en ambas bases");
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planes-con-estudiantes"] });
      toast.success("Estado actualizado correctamente");
      if (selectedEstudiante) {
        verPagosEstudiante(selectedEstudiante.estudiantes);
      }
    },
  });

  
  const totalEstudiantes = selectedPlan?.estudiantes?.length || 0;
  const totalPagado = selectedEstudiante?.cuotas?.filter((c: any) => c.estado === 'pagado').reduce((acc: number, c: any) => acc + Number(c.monto), 0) || 0;
  const totalPendiente = selectedEstudiante?.cuotas?.filter((c: any) => c.estado === 'pendiente').reduce((acc: number, c: any) => acc + Number(c.monto), 0) || 0;
  const totalVencido = selectedEstudiante?.cuotas?.filter((c: any) => c.estado === 'vencido').reduce((acc: number, c: any) => acc + Number(c.monto), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header con icono */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Pagos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visualice planes de pago y gestione el estado de las cuotas por estudiante
          </p>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Total</p>
                <p className="text-2xl font-bold mb-1">Planes Activos</p>
                <p className="text-4xl font-bold">{planes?.length || 0}</p>
              </div>
              <CreditCard className="w-16 h-16 text-purple-200 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-2">Total Estudiantes</p>
                <p className="text-5xl font-bold">
                  {planes?.filter((p: any) => p.estudiante_id != null).length || 0}
                </p>
              </div>
              <Users className="w-16 h-16 text-emerald-200 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-pink-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-2">Ingresos Totales</p>
                <p className="text-4xl font-bold">
                  S/ {planes?.reduce((acc: number, p: any) => acc + Number(p.total || 0), 0).toFixed(2) || "0.00"}
                </p>
              </div>
              <DollarSign className="w-16 h-16 text-orange-200 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla principal */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Planes de Pago</CardTitle>
          <CardDescription>
            Listado de planes activos con estudiantes inscritos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando planes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estudiantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(planes as any[])?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.nombre}</TableCell>
                    <TableCell>{plan.ciclos_academicos?.nombre}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                        {plan.nivel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {Number(plan.total).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verEstudiantesPlan(plan)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Estudiantes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal mejorado */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 -m-6 mb-0 p-6 rounded-t-lg">
            <div className="flex items-center gap-4 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <DialogTitle className="text-white text-2xl">
                  {selectedPlan?.nombre} - {selectedPlan?.ciclos_academicos?.nombre}
                </DialogTitle>
                <DialogDescription className="text-emerald-100">
                  {selectedEstudiante
                    ? `Cuotas de ${selectedEstudiante.estudiantes?.nombres} ${selectedEstudiante.estudiantes?.apellidos}`
                    : "Estudiantes inscritos en este plan"
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 pt-6">
              {!selectedEstudiante ? (
                <>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nivel Educativo</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedPlan.nivel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total del Plan</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {Number(selectedPlan.total).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Estudiantes Inscritos ({totalEstudiantes})
                  </h3>

                  {selectedPlan.estudiantes?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPlan.estudiantes?.map((matricula: any) => (
                        <div
                          key={matricula.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                              {matricula.estudiantes?.nombres?.charAt(0)}{matricula.estudiantes?.apellidos?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {matricula.estudiantes?.nombres} {matricula.estudiantes?.apellidos}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                DNI: {matricula.estudiantes?.dni}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verPagosEstudiante(matricula)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Pagos
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No hay estudiantes inscritos en este plan
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEstudiante(null)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a estudiantes
                  </Button>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {selectedEstudiante.estudiantes?.nombres?.charAt(0)}{selectedEstudiante.estudiantes?.apellidos?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {selectedEstudiante.estudiantes?.nombres} {selectedEstudiante.estudiantes?.apellidos}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          DNI: {selectedEstudiante.estudiantes?.dni}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de pagos */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Pagado</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        S/ {totalPagado.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
                      <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Pendiente</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                        S/ {totalPendiente.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400 mb-1">Vencido</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        S/ {totalVencido.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Cuota</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEstudiante.cuotas?.map((cuota: any) => (
                        <TableRow key={cuota.id}>
                          <TableCell>
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                {cuota.numero_cuota}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{cuota.concepto}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              S/ {Number(cuota.monto).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE")}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={cuota.estado}
                              onValueChange={(value) =>
                                cambiarEstadoMutation.mutate({ cuotaId: cuota.id, nuevoEstado: value, cuota })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="pagado">Pagado</SelectItem>
                                <SelectItem value="vencido">Vencido</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pagos;