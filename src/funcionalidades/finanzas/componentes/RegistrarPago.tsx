import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";
import { generarVoucherPago } from "@/servicios/pdf/generarVoucherPago";

const RegistrarPago = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    estudiante_id: "",
    cuota_id: "",
    metodo_pago: "efectivo" as const,
  });
  const [selectedCuota, setSelectedCuota] = useState<any>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<any>(null); 

  const { data: cuotasDisponibles, isLoading: loadingCuotas, error: errorCuotas } = useQuery({
    queryKey: ["cuotas-disponibles", formData.estudiante_id],
    queryFn: async () => {
      if (!formData.estudiante_id) return [];

      console.log(" Buscando cuotas para estudiante:", formData.estudiante_id);
      const cliente = supabaseFailover.getDirectClient();

      

      
      let planId = null;
      let planNombre = null;

      const { data: planesDirectos, error: errorPlanesDirectos } = await cliente
        .from("planes_pago")
        .select("id, nombre")
        .eq("estudiante_id", formData.estudiante_id)
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (errorPlanesDirectos) {
        console.error("Error buscando planes directos:", errorPlanesDirectos);
      } else {
        console.log("📋 Planes directos encontrados:", planesDirectos);
      }

      if (planesDirectos && planesDirectos.length > 0) {
        planId = planesDirectos[0].id;
        planNombre = planesDirectos[0].nombre;
        console.log(" Plan encontrado directamente:", planNombre, "ID:", planId);
      }

      
      if (!planId) {
        console.log(" No se encontró plan directo, buscando vía matrícula...");
        const { data: matriculas, error: errorMatriculas } = await cliente
          .from("matriculas")
          .select("plan_pago_id, planes_pago(nombre)")
          .eq("estudiante_id", formData.estudiante_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (errorMatriculas) {
          console.error("Error buscando matrículas:", errorMatriculas);
        } else {
          console.log("🎓 Matrículas encontradas:", matriculas);
        }

        if (matriculas && matriculas.length > 0 && matriculas[0].plan_pago_id) {
          planId = matriculas[0].plan_pago_id;
          planNombre = (matriculas[0].planes_pago as any)?.nombre;
          console.log(" Plan encontrado vía matrícula:", planNombre, "ID:", planId);
        }
      }

      if (!planId) {
        console.warn(" No se encontró plan de pago para el estudiante (ni directo ni por matrícula)", formData.estudiante_id);
        toast.warning("Este estudiante no tiene un plan de pago asignado. Por favor, cree un plan de pago primero.");
        return [];
      }

      
      console.log("🔎 Buscando cuotas para plan:", planId);
      const { data: cuotas, error: cuotasError } = await cliente
        .from("cuotas_pago")
        .select("*")
        .eq("plan_pago_id", planId)
        .in("estado", ["pendiente", "vencido"])
        .order("numero_cuota", { ascending: true });

      if (cuotasError) {
        console.error("Error obteniendo cuotas:", cuotasError);
        throw cuotasError;
      }

      console.log("💰 Cuotas disponibles encontradas:", cuotas?.length || 0, cuotas);

      if (!cuotas || cuotas.length === 0) {
        toast.info("No hay cuotas pendientes o vencidas para este estudiante.");
        return [];
      }

      
      const cuotasEnriquecidas = cuotas?.map(c => ({
        ...c,
        planes_pago: { nombre: planNombre }
      })) || [];

      console.log(" Retornando cuotas enriquecidas:", cuotasEnriquecidas);
      return cuotasEnriquecidas;
    },
    enabled: !!formData.estudiante_id,
  });

  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-pagos"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("estudiantes", {
        filtros: { estado: "activo" }
      });
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPago: typeof formData) => {
      console.log("💳 Procesando pago:", newPago);

      const cliente = supabaseFailover.getDirectClient();

      
      const { data: cuotaInfo, error: cuotaError } = await cliente
        .from("cuotas_pago")
        .select("*, planes_pago(estudiante_id, ciclo_academico_id)")
        .eq("id", newPago.cuota_id)
        .single();

      if (cuotaError || !cuotaInfo) {
        console.error("Error obteniendo cuota:", cuotaError);
        throw new Error("No se pudo obtener la información de la cuota");
      }

      console.log("📋 Información de cuota:", cuotaInfo);

      
      const estudianteId = (cuotaInfo.planes_pago as any).estudiante_id;
      const { data: estudianteInfo, error: estudianteError } = await cliente
        .from("estudiantes")
        .select("sede_id")
        .eq("id", estudianteId)
        .single();

      if (estudianteError || !estudianteInfo) {
        console.error("Error obteniendo estudiante:", estudianteError);
        throw new Error("No se pudo obtener la información del estudiante");
      }

      
      const pagoPayload = {
        estudiante_id: estudianteId,
        sede_id: estudianteInfo.sede_id,
        cuota_id: newPago.cuota_id,
        monto: cuotaInfo.monto,
        concepto: `Pago de cuota: ${cuotaInfo.concepto}`,
        metodo_pago: newPago.metodo_pago,
        estado: "completado",
        fecha_pago: new Date().toISOString(),
      };

      console.log("💾 Registrando pago en AMBAS bases:", pagoPayload);
      const { data: pagoData, error: pagoError } = await supabaseFailover.insertSingle("pagos", pagoPayload);

      if (pagoError) {
        console.error("Error creando registro de pago:", pagoError);
        throw pagoError;
      }

      console.log(" Pago registrado en AMBAS bases de datos:", pagoData);

      
      const { error: updateError } = await supabaseFailover.update("cuotas_pago", newPago.cuota_id, {
        estado: "pagado",
        fecha_pago: new Date().toISOString(),
      });

      if (updateError) {
        console.error("Error actualizando cuota:", updateError);
        throw updateError;
      }

      console.log(" Cuota actualizada a estado 'pagado'");

      return {
        success: true,
        message: "Pago procesado y registrado exitosamente",
        pago_id: pagoData.id
      };
    },
    onSuccess: async (data: any) => {
      console.log("🎉 Pago completado exitosamente:", data);

      
      try {
        if (selectedCuota && formData.estudiante_id) {
          const cliente = supabaseFailover.getDirectClient();

          if (!selectedEstudiante) {
            console.error("No hay datos del estudiante guardados");
            return;
          }

          
          const { data: planData } = await cliente
            .from("planes_pago")
            .select(`
              nombre,
              total,
              pagado,
              restante,
              ciclos_academicos(nombre, fecha_inicio, fecha_fin)
            `)
            .eq("id", selectedCuota.plan_pago_id)
            .single();

          if (planData) {
            const estudiante = selectedEstudiante;

            
            const numeroVoucher = `VP-${new Date().getFullYear()}-${String(data.pago_id).padStart(6, '0')}`;

            const voucherData = {
              numeroVoucher,
              estudiante: {
                nombres: estudiante.nombres,
                apellidos: estudiante.apellidos,
                dni: estudiante.dni,
                codigo: estudiante.codigo,
              },
              ciclo: {
                nombre: (planData.ciclos_academicos as any).nombre,
                fecha_inicio: (planData.ciclos_academicos as any).fecha_inicio,
                fecha_fin: (planData.ciclos_academicos as any).fecha_fin,
              },
              planPago: {
                nombre: planData.nombre,
                total: planData.total,
                pagado: planData.pagado + selectedCuota.monto, 
                restante: planData.restante - selectedCuota.monto,
              },
              cuota: {
                numero_cuota: selectedCuota.numero_cuota,
                concepto: selectedCuota.concepto,
                monto: selectedCuota.monto,
                fecha_vencimiento: selectedCuota.fecha_vencimiento,
              },
              metodoPago: formData.metodo_pago,
              montoPagado: selectedCuota.monto,
              fechaPago: new Date().toISOString(),
            };

            generarVoucherPago(voucherData);
            console.log("📄 Voucher PDF generado exitosamente");
          }
        }
      } catch (error) {
        console.error("Error generando voucher:", error);
      }

      queryClient.invalidateQueries({ queryKey: ["cuotas-pago"] });
      queryClient.invalidateQueries({ queryKey: ["cuotas-disponibles"] });
      queryClient.invalidateQueries({ queryKey: ["planes-pago"] });
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      toast.success(data.message + " - Voucher descargado");
      setOpen(false);
      setFormData({
        estudiante_id: "",
        cuota_id: "",
        metodo_pago: "efectivo",
      });
      setSelectedCuota(null);
    },
    onError: (error: any) => {
      console.error("Error procesando pago:", error);
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const { data: pagosRecientes, isLoading: loadingPagos } = useQuery({
    queryKey: ["pagos-recientes"],
    queryFn: async () => {
      const cliente = supabaseFailover.getDirectClient();
      const { data, error } = await cliente
        .from("pagos")
        .select(`
          *,
          estudiantes(nombres, apellidos, dni)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error cargando pagos recientes:", error);
        return [];
      }
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Registrar Pago
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Procesamiento de pagos y recaudación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-all duration-300">
                <DollarSign className="mr-2 h-4 w-4" />
                Nuevo Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Registrar Nuevo Pago</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Seleccione el estudiante y la cuota a pagar
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estudiante" className="text-foreground">Estudiante</Label>
                  <Select
                    value={formData.estudiante_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, estudiante_id: value, cuota_id: "" });
                      setSelectedCuota(null);
                      
                      const estudianteSeleccionado = (estudiantes as any[])?.find(est => est.id === value);
                      setSelectedEstudiante(estudianteSeleccionado);
                      console.log("Estudiante seleccionado guardado:", estudianteSeleccionado);
                    }}
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
                </div>

                {formData.estudiante_id && (
                  <div className="space-y-2">
                    <Label htmlFor="cuota" className="text-foreground">Cuota a Pagar</Label>
                    <Select
                      value={formData.cuota_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, cuota_id: value });
                        const cuota = (cuotasDisponibles as any[])?.find(c => c.id === value);
                        setSelectedCuota(cuota);
                      }}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Seleccione cuota" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {(cuotasDisponibles as any[])?.map((cuota) => (
                          <SelectItem key={cuota.id} value={cuota.id}>
                            Cuota {cuota.numero_cuota} - {cuota.concepto} - S/ {Number(cuota.monto).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedCuota && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg space-y-2 border border-amber-100 dark:border-amber-800">
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-900 dark:text-amber-100">Concepto:</span>
                      <span className="text-amber-800 dark:text-amber-200">{selectedCuota.concepto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-900 dark:text-amber-100">Monto:</span>
                      <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">S/ {Number(selectedCuota.monto).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-900 dark:text-amber-100">Vencimiento:</span>
                      <span className="text-amber-800 dark:text-amber-200">{new Date(selectedCuota.fecha_vencimiento).toLocaleDateString("es-PE")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-amber-900 dark:text-amber-100">Plan:</span>
                      <span className="text-amber-800 dark:text-amber-200">{selectedCuota.planes_pago?.nombre}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="metodo" className="text-foreground">Método de Pago</Label>
                  <Select
                    value={formData.metodo_pago}
                    onValueChange={(value: any) => setFormData({ ...formData, metodo_pago: value })}
                  >
                    <SelectTrigger className="bg-background text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={createMutation.isPending || !formData.cuota_id}
                >
                  {createMutation.isPending ? "Procesando..." : "Procesar Pago"}
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
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pagos Recientes</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(pagosRecientes as any[])?.length || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Últimos Pagos Registrados
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Historial de transacciones recientes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPagos ? (
            <div className="p-8 text-center text-slate-500">Cargando pagos...</div>
          ) : pagosRecientes && pagosRecientes.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Fecha</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estudiante</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Concepto</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Monto</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosRecientes.map((pago: any) => (
                  <TableRow key={pago.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {new Date(pago.created_at).toLocaleDateString("es-PE")} <span className="text-xs text-slate-400">{new Date(pago.created_at).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                      {pago.estudiantes?.nombres} {pago.estudiantes?.apellidos}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{pago.concepto}</TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                      S/ {Number(pago.monto).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                        {pago.metodo_pago}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <p>No hay pagos registrados recientemente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrarPago;
