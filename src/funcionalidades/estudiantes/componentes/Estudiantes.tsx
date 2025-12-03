"use client";

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
import { obtenerClienteSupabasePrimario, obtenerClienteSupabaseSecundario } from "@/servicios/base-datos/conexionPostgres";
import { toast } from "sonner";
import { UserPlus, Eye, Edit, Trash2, CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utilidades/utils";
import { Estudiante, EstudianteForm, FormFieldsProps } from "@/tipos/comunes.tipos";
import { useAuth } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import { useActivityLogger } from "@/ganchos/useActivityLogger";





export interface EstudianteUpdate {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  sede_id?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  sexo?: string;
  edad?: number | null;
  fecha_nacimiento?: string | null;
  apoderado_dni?: string;
  apoderado_nombres?: string;
  apoderado_apellidos?: string;
  apoderado_email?: string;
  apoderado_telefono?: string;
  apoderado_sexo?: string;
  apoderado_edad?: number | null;
  apoderado_fecha_nacimiento?: string | null;
  apoderado_direccion?: string;
}




const FormFields: React.FC<FormFieldsProps> = ({
  formData,
  setFormData,
  sedes,
  fechaNacimiento,
  setFechaNacimiento,
  fechaNacimientoApoderado,
  setFechaNacimientoApoderado
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 col-span-2">
        <h3 className="text-lg font-semibold">Datos del Estudiante</h3>
      </div>

      {/* Sede */}
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
            {sedes?.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.nombre} - {sede.ciudad}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DNI */}
      <div className="space-y-2">
        <Label htmlFor="dni">DNI</Label>
        <Input
          id="dni"
          value={formData.dni}
          onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
          required
        />
      </div>

      {/* Nombres */}
      <div className="space-y-2">
        <Label htmlFor="nombres">Nombres</Label>
        <Input
          id="nombres"
          value={formData.nombres}
          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
          required
        />
      </div>

      {/* Apellidos */}
      <div className="space-y-2">
        <Label htmlFor="apellidos">Apellidos</Label>
        <Input
          id="apellidos"
          value={formData.apellidos}
          onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
          required
        />
      </div>

      {/* Sexo */}
      <div className="space-y-2">
        <Label htmlFor="sexo">Sexo</Label>
        <Select
          value={formData.sexo}
          onValueChange={(value) => setFormData({ ...formData, sexo: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MASCULINO">MASCULINO</SelectItem>
            <SelectItem value="FEMENINO">FEMENINO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Edad */}
      <div className="space-y-2">
        <Label htmlFor="edad">Edad</Label>
        <Input
          id="edad"
          type="number"
          value={formData.edad}
          onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
        />
      </div>

      {/* Fecha de Nacimiento */}
      <div className="space-y-2">
        <Label>Fecha de Nacimiento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !fechaNacimiento && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fechaNacimiento ? format(fechaNacimiento, "PPP") : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaNacimiento}
              onSelect={setFechaNacimiento}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      {/* Teléfono */}
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
        />
      </div>

      {/* Dirección */}
      <div className="space-y-2 col-span-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />
      </div>

      {/* SECCIÓN APODERADO */}
      <div className="space-y-2 col-span-2 pt-4">
        <h3 className="text-lg font-semibold">Datos del Padre o Apoderado</h3>
      </div>

      {/* DNI Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_dni">DNI Apoderado</Label>
        <Input
          id="apoderado_dni"
          value={formData.apoderado_dni}
          onChange={(e) => setFormData({ ...formData, apoderado_dni: e.target.value })}
        />
      </div>

      {/* Nombres Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_nombres">Nombres Apoderado</Label>
        <Input
          id="apoderado_nombres"
          value={formData.apoderado_nombres}
          onChange={(e) => setFormData({ ...formData, apoderado_nombres: e.target.value })}
        />
      </div>

      {/* Apellidos Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_apellidos">Apellidos Apoderado</Label>
        <Input
          id="apoderado_apellidos"
          value={formData.apoderado_apellidos}
          onChange={(e) => setFormData({ ...formData, apoderado_apellidos: e.target.value })}
        />
      </div>

      {/* Sexo Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_sexo">Sexo Apoderado</Label>
        <Select
          value={formData.apoderado_sexo}
          onValueChange={(value) => setFormData({ ...formData, apoderado_sexo: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MASCULINO">MASCULINO</SelectItem>
            <SelectItem value="FEMENINO">FEMENINO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Edad Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_edad">Edad Apoderado</Label>
        <Input
          id="apoderado_edad"
          type="number"
          value={formData.apoderado_edad}
          onChange={(e) => setFormData({ ...formData, apoderado_edad: e.target.value })}
        />
      </div>

      {/* Fecha de Nacimiento Apoderado */}
      <div className="space-y-2">
        <Label>Fecha de Nacimiento Apoderado</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !fechaNacimientoApoderado && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fechaNacimientoApoderado ? format(fechaNacimientoApoderado, "PPP") : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaNacimientoApoderado}
              onSelect={setFechaNacimientoApoderado}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Email Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_email">Email Apoderado</Label>
        <Input
          id="apoderado_email"
          type="email"
          value={formData.apoderado_email}
          onChange={(e) => setFormData({ ...formData, apoderado_email: e.target.value })}
        />
      </div>

      {/* Teléfono Apoderado */}
      <div className="space-y-2">
        <Label htmlFor="apoderado_telefono">Teléfono Apoderado</Label>
        <Input
          id="apoderado_telefono"
          value={formData.apoderado_telefono}
          onChange={(e) => setFormData({ ...formData, apoderado_telefono: e.target.value })}
        />
      </div>

      {/* Dirección Apoderado */}
      <div className="space-y-2 col-span-2">
        <Label htmlFor="apoderado_direccion">Dirección Apoderado</Label>
        <Input
          id="apoderado_direccion"
          value={formData.apoderado_direccion}
          onChange={(e) => setFormData({ ...formData, apoderado_direccion: e.target.value })}
        />
      </div>
    </div>
  </div>
);




const Estudiantes = () => {
  const queryClient = useQueryClient();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date>();
  const [fechaNacimientoApoderado, setFechaNacimientoApoderado] = useState<Date>();
  const { user, role } = useAuth();

  const [formData, setFormData] = useState<EstudianteForm>({
    sede_id: "",
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    sexo: "",
    edad: "",
    fecha_nacimiento: null,
    apoderado_dni: "",
    apoderado_nombres: "",
    apoderado_apellidos: "",
    apoderado_email: "",
    apoderado_telefono: "",
    apoderado_direccion: "",
    apoderado_sexo: "",
    apoderado_edad: "",
    apoderado_fecha_nacimiento: null,
  });


  const { data: estudiantes, isLoading, error: queryError } = useQuery({
    queryKey: ["estudiantes"],
    queryFn: async () => {
      console.log("📚 [Estudiantes Query] Ejecutando query...");

      try {
        const cliente = supabaseFailover.getDirectClient();

        const { data, error } = await cliente
          .from("estudiantes")
          .select("*, sedes(nombre, ciudad)")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(" [Estudiantes Query] Error:", error);
          throw error;
        }

        console.log(` [Estudiantes Query] Datos obtenidos: ${data?.length || 0} estudiantes`);
        return data;
      } catch (err: any) {
        console.error(" [Estudiantes Query] Excepción capturada:", err);

        // Si es un error de red (Failed to fetch, CORS, etc.), forzar failover
        if (err?.message?.includes('Failed to fetch') ||
          err?.message?.includes('NetworkError') ||
          err?.message?.includes('CORS') ||
          err?.name === 'TypeError') {

          console.warn("[Estudiantes] Error de red detectado, activando failover...");

          // Forzar cambio a secundaria
          supabaseFailover.forceFailover('Error de red en query de estudiantes');

          // Reintentar con el nuevo cliente (ahora será secundaria)
          const clienteSecundario = supabaseFailover.getDirectClient();
          const { data, error } = await clienteSecundario
            .from("estudiantes")
            .select("*, sedes(nombre, ciudad)")
            .order("created_at", { ascending: false });

          if (!error) {
            console.log(` [Estudiantes Query] Reintento con SECUNDARIA exitoso: ${data?.length || 0} estudiantes`);
            return data;
          }

          console.error(" [Estudiantes Query] SECUNDARIA también falló:", error);
          throw error;
        }

        throw err;
      }
    },

    enabled: typeof window !== 'undefined',
    retry: false, // Deshabilitamos retry de React Query porque manejamos failover manualmente
    staleTime: 30000, // Cache por 30 segundos
  });



  const { data: sedes } = useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data } = await supabaseFailover.select("sedes", {
        filtros: { activo: true }
      });
      return data || [];
    },
    enabled: typeof window !== 'undefined',
  });


  const createMutation = useMutation({
    mutationFn: async (newEstudiante: Estudiante) => {
      const { data, error } = await supabaseFailover.insertSingle("estudiantes", newEstudiante);
      if (error) throw error;
      return data;
    },
    onSuccess: async (nuevo) => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      toast.success("Estudiante registrado exitosamente");


      if (nuevo) {
        await logCreate(
          'estudiantes',
          'Estudiante',
          (nuevo as any).id,
          nuevo
        );
      }

      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });


  const updateMutation = useMutation({
    mutationFn: async (estudianteData: EstudianteUpdate) => {
      const { data, error } = await supabaseFailover.update("estudiantes", estudianteData.id, estudianteData);
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: async (actualizado) => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      toast.success("Estudiante actualizado exitosamente");


      if (selectedEstudiante && actualizado) {
        await logUpdate(
          'estudiantes',
          'Estudiante',
          actualizado.id,
          selectedEstudiante,
          actualizado
        );
      }

      setEditOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async ({ id, estudianteData }: { id: string; estudianteData: any }) => {
      console.log(` [DELETE CASCADA] Iniciando eliminación de estudiante: ${id}`);

      let deletedCounts = {
        pagos: 0,
        cuotas: 0,
        planes: 0,
        matriculas: 0,
        salones: 0,
        profiles: 0
      };

      // Función auxiliar para hacer queries con failover
      const queryConFailover = async (tabla: string, filtros: Record<string, any>) => {
        console.log(`🔍 [QUERY] Consultando ${tabla} con filtros:`, filtros);

        try {
          const cliente = supabaseFailover.getDirectClient();
          console.log(`  📍 Cliente obtenido (failover state: ${supabaseFailover.getStatus().usandoSecundaria ? 'SECUNDARIA' : 'PRIMARIA'})`);

          const query = cliente.from(tabla).select("id");

          // Aplicar filtros
          let queryWithFilters = query;
          for (const [key, value] of Object.entries(filtros)) {
            queryWithFilters = queryWithFilters.eq(key, value);
          }

          console.log(`  ⏳ Ejecutando query...`);
          const { data, error } = await queryWithFilters;

          if (error) {
            console.error(`   Query retornó error:`, error);
            // Si is error de consulta normal (no de red), retornar
            if (!error.message?.includes('Failed to fetch') && error.name !== 'TypeError') {
              console.warn(`   Error de SQL/permisos (no de red), retornando []`);
              return [];
            }
            console.warn(`  Error de RED detectado, lanzando excepción...`);
            throw error; // Si es error de red, lanzar para activar failover
          }

          console.log(`   Query exitosa, ${data?.length || 0} registros encontrados`);
          return data || [];
        } catch (err: any) {
          console.error(`  💥 Excepción capturada:`, err);

          // Error de red, activar failover
          if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
            console.warn(`  [QUERY] Error de red en ${tabla}, activando failover`);
            supabaseFailover.forceFailover(`Error de red en query ${tabla}`);

            // Reintentar con secundaria
            console.log(`  Reintentando con SECUNDARIA...`);
            const clienteSecundario = supabaseFailover.getDirectClient();
            const query = clienteSecundario.from(tabla).select("id");

            let queryWithFilters = query;
            for (const [key, value] of Object.entries(filtros)) {
              queryWithFilters = queryWithFilters.eq(key, value);
            }

            const { data, error: retryError } = await queryWithFilters;

            if (retryError) {
              console.error(`   Reintento SECUNDARIA también falló:`, retryError);
              return [];
            }

            console.log(`   Reintento exitoso, ${data?.length || 0} registros encontrados`);
            return data || [];
          }

          console.error(`   Error inesperado (no de red) en query ${tabla}:`, err);
          return [];
        }
      };

      try {
        // 1. Eliminar ventas de inventario
        const ventas = await queryConFailover("ventas_inventario", { estudiante_id: id });
        if (ventas.length > 0) {
          console.log(`✂️ Eliminando ${ventas.length} ventas de inventario...`);
          for (const venta of ventas) {
            await supabaseFailover.delete("ventas_inventario", venta.id);
          }
        }

        // 2. Eliminar deudas
        const deudas = await queryConFailover("deudas_estudiantes", { estudiante_id: id });
        if (deudas.length > 0) {
          console.log(`✂️ Eliminando ${deudas.length} registros de deuda...`);
          for (const deuda of deudas) {
            await supabaseFailover.delete("deudas_estudiantes", deuda.id);
          }
        }

        // 3. Eliminar pagos (antes de planes)
        const pagos = await queryConFailover("pagos", { estudiante_id: id });
        if (pagos.length > 0) {
          console.log(`✂️ Eliminando ${pagos.length} pagos...`);
          for (const pago of pagos) {
            await supabaseFailover.delete("pagos", pago.id);
          }
          deletedCounts.pagos = pagos.length;
        }

        // 4. Eliminar planes de pago (CON sus cuotas primero)
        const planes = await queryConFailover("planes_pago", { estudiante_id: id });
        console.log(`📋 [PLANES] Encontrados ${planes.length} planes de pago para eliminar`);

        if (planes.length > 0) {
          console.log(`✂️ Eliminando ${planes.length} planes de pago...`);
          for (const plan of planes) {
            try {
              // Primero eliminar cuotas del plan
              const cuotas = await queryConFailover("cuotas_pago", { plan_pago_id: plan.id });

              if (cuotas.length > 0) {
                console.log(`  ✂️ Eliminando ${cuotas.length} cuotas del plan ${plan.id}...`);
                for (const cuota of cuotas) {
                  const { error: cuotaError } = await supabaseFailover.delete("cuotas_pago", cuota.id);
                  if (cuotaError) {
                    console.error(`    ❌ Error eliminando cuota ${cuota.id}:`, cuotaError);
                    throw cuotaError;
                  }
                }
                deletedCounts.cuotas += cuotas.length;
              }

              // Luego eliminar el plan
              console.log(`  ✂️ Eliminando plan ${plan.id}...`);
              const { error: planError } = await supabaseFailover.delete("planes_pago", plan.id);
              if (planError) {
                console.error(`    ❌ Error eliminando plan ${plan.id}:`, planError);
                throw planError;
              }
              console.log(`    Plan ${plan.id} eliminado exitosamente`);
            } catch (planErr: any) {
              console.error(`  💥 Error crítico eliminando plan ${plan.id}:`, planErr);
              throw new Error(`No se pudo eliminar el plan de pago: ${planErr.message}`);
            }
          }
          deletedCounts.planes = planes.length;
          console.log(`Todos los ${planes.length} planes eliminados correctamente`);
        } else {
          console.log(`ℹ️ No se encontraron planes de pago para este estudiante`);
        }

        // 5. Eliminar matrículas
        const matriculas = await queryConFailover("matriculas", { estudiante_id: id });
        if (matriculas.length > 0) {
          console.log(`✂️ Eliminando ${matriculas.length} matrículas...`);
          for (const matricula of matriculas) {
            await supabaseFailover.delete("matriculas", matricula.id);
          }
          deletedCounts.matriculas = matriculas.length;
        }

        // 6. Eliminar asignaciones a salones
        const salones = await queryConFailover("estudiantes_salones", { estudiante_id: id });
        if (salones.length > 0) {
          console.log(`✂️ Eliminando ${salones.length} asignaciones a salones...`);
          for (const salon of salones) {
            await supabaseFailover.delete("estudiantes_salones", salon.id);
          }
          deletedCounts.salones = salones.length;
        }

        // 7. Eliminar perfil y usuario
        console.log(`✂️ Eliminando perfil y usuario vinculado vía API...`);
        try {
          const response = await fetch('/api/estudiantes/eliminar-perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estudiante_id: id })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn(" Advertencia al eliminar perfil:", errorData.error);
          } else {
            deletedCounts.profiles = 1;
          }
        } catch (error) {
          console.warn(" Error llamando API eliminar-perfil:", error);
        }

        // 8. Finalmente eliminar el estudiante
        console.log(`✂️ [FINAL] Eliminando estudiante ${id}...`);
        const { error } = await supabaseFailover.delete("estudiantes", id);
        if (error) {
          console.error(` Error al eliminar estudiante:`, error);
          throw error;
        }

        console.log(` [DELETE CASCADA] Estudiante eliminado exitosamente`);
        return { id, estudianteData, deletedCounts };
      } catch (error: any) {
        console.error(` [DELETE CASCADA] Error al eliminar estudiante:`, error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
      const { deletedCounts } = result;
      const totalDeleted = deletedCounts.pagos + deletedCounts.cuotas + deletedCounts.planes +
        deletedCounts.matriculas + deletedCounts.salones + deletedCounts.profiles;

      toast.success(`Estudiante eliminado (${totalDeleted} registros relacionados eliminados)`);


      if (result) {
        await logDelete(
          'estudiantes',
          'Estudiante',
          (result.estudianteData as any).id,
          result.estudianteData
        );
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
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
      sexo: "",
      edad: "",
      fecha_nacimiento: "",
      apoderado_dni: "",
      apoderado_nombres: "",
      apoderado_apellidos: "",
      apoderado_email: "",
      apoderado_telefono: "",
      apoderado_sexo: "",
      apoderado_edad: "",
      apoderado_fecha_nacimiento: "",
      apoderado_direccion: "",
    });
    setFechaNacimiento(undefined);
    setFechaNacimientoApoderado(undefined);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      apoderado_edad: formData.apoderado_edad ? parseInt(formData.apoderado_edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
      apoderado_fecha_nacimiento: fechaNacimientoApoderado ? format(fechaNacimientoApoderado, "yyyy-MM-dd") : null,
    };
    createMutation.mutate(dataToSubmit as Estudiante);
  };


  const handleEdit = (estudiante: Estudiante) => {
    setSelectedEstudiante(estudiante);
    setFormData({
      sede_id: estudiante.sede_id || "",
      dni: estudiante.dni || "",
      nombres: estudiante.nombres || "",
      apellidos: estudiante.apellidos || "",
      email: estudiante.email || "",
      telefono: estudiante.telefono || "",
      direccion: estudiante.direccion || "",
      sexo: estudiante.sexo || "",
      edad: estudiante.edad?.toString() || "",
      fecha_nacimiento: estudiante.fecha_nacimiento || "",
      apoderado_dni: estudiante.apoderado_dni || "",
      apoderado_nombres: estudiante.apoderado_nombres || "",
      apoderado_apellidos: estudiante.apoderado_apellidos || "",
      apoderado_email: estudiante.apoderado_email || "",
      apoderado_telefono: estudiante.apoderado_telefono || "",
      apoderado_sexo: estudiante.apoderado_sexo || "",
      apoderado_edad: estudiante.apoderado_edad?.toString() || "",
      apoderado_fecha_nacimiento: estudiante.apoderado_fecha_nacimiento || "",
      apoderado_direccion: estudiante.apoderado_direccion || "",
    });
    if (estudiante.fecha_nacimiento) {
      setFechaNacimiento(new Date(estudiante.fecha_nacimiento));
    }
    if (estudiante.apoderado_fecha_nacimiento) {
      setFechaNacimientoApoderado(new Date(estudiante.apoderado_fecha_nacimiento));
    }
    setEditOpen(true);
  };


  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEstudiante) {
      toast.error("No hay estudiante seleccionado.");
      return;
    }

    const dataToUpdate: EstudianteUpdate = {
      id: selectedEstudiante.id,
      ...formData,
      edad: formData.edad ? parseInt(formData.edad) : null,
      apoderado_edad: formData.apoderado_edad ? parseInt(formData.apoderado_edad) : null,
      fecha_nacimiento: fechaNacimiento ? format(fechaNacimiento, "yyyy-MM-dd") : null,
      apoderado_fecha_nacimiento: fechaNacimientoApoderado
        ? format(fechaNacimientoApoderado, "yyyy-MM-dd")
        : null,
    };

    updateMutation.mutate(dataToUpdate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      {/* Header Moderno */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Estudiantes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gestión y seguimiento académico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Estudiante</DialogTitle>
                <DialogDescription>
                  Complete los datos del estudiante y apoderado
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <FormFields
                  formData={formData}
                  setFormData={setFormData}
                  sedes={sedes}
                  fechaNacimiento={fechaNacimiento}
                  setFechaNacimiento={setFechaNacimiento}
                  fechaNacimientoApoderado={fechaNacimientoApoderado}
                  setFechaNacimientoApoderado={setFechaNacimientoApoderado}
                />
                <Button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Registrando..." : "Registrar Estudiante"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards (Opcional - Resumen rápido) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-lg transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Estudiantes</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {(estudiantes as any[])?.length || 0}
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
              Directorio de Alumnos
            </CardTitle>
            {/* Aquí podrías agregar un buscador más adelante */}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Cargando estudiantes...</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">DNI</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Nombres</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Apellidos</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Sede</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(estudiantes as any[])?.map((estudiante) => (
                  <TableRow key={estudiante.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{estudiante.dni}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{estudiante.nombres}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{estudiante.apellidos}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {estudiante.sedes?.nombre}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estudiante.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                        {estudiante.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          onClick={() => {
                            setSelectedEstudiante(estudiante);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          onClick={() => handleEdit(estudiante)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          onClick={() => {
                            if (confirm("¿Está seguro de eliminar este estudiante?")) {
                              deleteMutation.mutate({ id: estudiante.id, estudianteData: estudiante });
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

      {/* Dialog para editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Estudiante</DialogTitle>
            <DialogDescription>
              Actualice los datos del estudiante
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <FormFields
              formData={formData}
              setFormData={setFormData}
              sedes={sedes}
              fechaNacimiento={fechaNacimiento}
              setFechaNacimiento={setFechaNacimiento}
              fechaNacimientoApoderado={fechaNacimientoApoderado}
              setFechaNacimientoApoderado={setFechaNacimientoApoderado}
            />
            <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Estudiante"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Información del Estudiante</DialogTitle>
          </DialogHeader>
          {selectedEstudiante && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Datos del Estudiante</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>DNI:</strong> {selectedEstudiante.dni}</div>
                  <div><strong>Nombres:</strong> {selectedEstudiante.nombres}</div>
                  <div><strong>Apellidos:</strong> {selectedEstudiante.apellidos}</div>
                  <div><strong>Sexo:</strong> {selectedEstudiante.sexo || "N/A"}</div>
                  <div><strong>Edad:</strong> {selectedEstudiante.edad || "N/A"}</div>
                  <div><strong>Fecha Nacimiento:</strong> {selectedEstudiante.fecha_nacimiento || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedEstudiante.email || "N/A"}</div>
                  <div><strong>Teléfono:</strong> {selectedEstudiante.telefono || "N/A"}</div>
                  <div className="col-span-2"><strong>Dirección:</strong> {selectedEstudiante.direccion || "N/A"}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Datos del Apoderado</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>DNI:</strong> {selectedEstudiante.apoderado_dni || "N/A"}</div>
                  <div><strong>Nombres:</strong> {selectedEstudiante.apoderado_nombres || "N/A"}</div>
                  <div><strong>Apellidos:</strong> {selectedEstudiante.apoderado_apellidos || "N/A"}</div>
                  <div><strong>Sexo:</strong> {selectedEstudiante.apoderado_sexo || "N/A"}</div>
                  <div><strong>Edad:</strong> {selectedEstudiante.apoderado_edad || "N/A"}</div>
                  <div><strong>Fecha Nacimiento:</strong> {selectedEstudiante.apoderado_fecha_nacimiento || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedEstudiante.apoderado_email || "N/A"}</div>
                  <div><strong>Teléfono:</strong> {selectedEstudiante.apoderado_telefono || "N/A"}</div>
                  <div className="col-span-2"><strong>Dirección:</strong> {selectedEstudiante.apoderado_direccion || "N/A"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estudiantes;