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
import { Plus, Pencil, Trash2, Users, BookOpen, User } from "lucide-react";
import { toast } from "sonner";

interface GradoSeccion {
  id: string;
  grado: string;
  nivel: string;
  seccion: string;
  sede_id: string;
  activo: boolean | null;
  created_at?: string | null;
  sedes?: { nombre: string };
}

interface GradoDetails {
  totalEstudiantes: number;
  totalCursos: number;
  profesores: string[];
}

export function Grados() {
  const [grados, setGrados] = useState<GradoSeccion[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrado, setEditingGrado] = useState<GradoSeccion | null>(null);
  const [gradoDetails, setGradoDetails] = useState<Record<string, GradoDetails>>({});

  const [formData, setFormData] = useState({
    nivel: "PRIMARIA",
    grado: "1°",
    seccion: "A",
    sede_id: "",
    activo: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const supabase = supabaseFailover.getDirectClient();
      const [{ data: sedesData }, { data: gradosData }] = await Promise.all([
        supabase.from("sedes").select("*"),
        supabase.from("grados_secciones").select("*, sedes(nombre)").order("grado, seccion"),
      ]);

      if (sedesData) setSedes(sedesData);
      if (gradosData) {
        setGrados(gradosData);
        await loadGradoDetails(gradosData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadGradoDetails = async (gradosData: GradoSeccion[]) => {
    const supabase = supabaseFailover.getDirectClient();
    const details: Record<string, GradoDetails> = {};

    for (const grado of gradosData) {
      const [{ count: estudiantes }, { data: cursos }] = await Promise.all([
        supabase
          .from("matriculas")
          .select("*", { count: "exact", head: true })
          .eq("grado_seccion_id", grado.id),
        supabase
          .from("cursos")
          .select("profesor_id, profesores(nombres, apellidos)")
          .eq("grado_seccion_id", grado.id),
      ]);

      const profesoresUnicos = new Set(
        (cursos as any[])?.filter(c => c.profesores).map((c: any) =>
          `${c.profesores.nombres} ${c.profesores.apellidos}`
        ) || []
      );

      details[grado.id] = {
        totalEstudiantes: estudiantes || 0,
        totalCursos: cursos?.length || 0,
        profesores: Array.from(profesoresUnicos),
      };
    }

    setGradoDetails(details);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGrado) {
        const { error } = await supabaseFailover.update("grados_secciones", editingGrado.id, formData);

        if (error) throw error;
        toast.success("Grado actualizado exitosamente");
      } else {
        const { error } = await supabaseFailover.insert("grados_secciones", formData);

        if (error) throw error;
        toast.success("Grado creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      if (error.code === "23505") {
        toast.error("Este grado y sección ya existe en esta sede");
      } else {
        toast.error("Error al guardar");
      }
    }
  };

  const handleEdit = (grado: GradoSeccion) => {
    setEditingGrado(grado);
    setFormData({
      nivel: grado.nivel || "PRIMARIA",
      grado: grado.grado,
      seccion: grado.seccion,
      sede_id: grado.sede_id,
      activo: grado.activo ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const supabase = supabaseFailover.getDirectClient();

      // 1. Verificar si hay salones asociados
      const { data: salones } = await supabase
        .from("salones")
        .select("id, codigo, nombre")
        .eq("nivel", grados.find(g => g.id === id)?.nivel)
        .eq("grado", grados.find(g => g.id === id)?.grado)
        .eq("seccion", grados.find(g => g.id === id)?.seccion);

      if (salones && salones.length > 0) {
        toast.error(`No se puede eliminar: hay ${salones.length} salones asociados a este grado/sección`);
        return;
      }

      // 2. Verificar si hay matrículas asociadas (por el grado_seccion_id)
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select("id")
        .eq("grado_seccion_id", id);

      if (matriculas && matriculas.length > 0) {
        toast.error(`No se puede eliminar: hay ${matriculas.length} matrículas asociadas a este grado/sección`);
        return;
      }

      // 3. Si no hay registros relacionados, proceder a eliminar
      if (!confirm("¿Estás seguro de eliminar este grado/sección?")) return;

      const { error } = await supabaseFailover.delete("grados_secciones", id);

      if (error) throw error;

      toast.success("Grado/sección eliminado exitosamente");
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nivel: "PRIMARIA", grado: "1°", seccion: "A", sede_id: "", activo: true });
    setEditingGrado(null);
  };

  const getGradoOptions = () => {
    if (formData.nivel === "INICIAL") {
      return ["3 años", "4 años", "5 años"];
    }
    return ["1°", "2°", "3°", "4°", "5°", "6°"];
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
              Grados y Secciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gestión de estructura académica y asignación de aulas
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
                Nuevo Grado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editingGrado ? "Editar Grado" : "Crear Nuevo Grado"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
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

                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label htmlFor="sede" className="text-foreground">Sede</Label>
                  <Select value={formData.sede_id} onValueChange={(value) => setFormData({ ...formData, sede_id: value })} required>
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
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {editingGrado ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grados.map((grado) => {
          const details = gradoDetails[grado.id];
          return (
            <Card key={grado.id} className="bg-white dark:bg-slate-900 border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {grado.grado} - "{grado.seccion}"
                  </CardTitle>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {grado.nivel}
                  </span>
                </div>
                <Badge variant={grado.activo ? "default" : "secondary"} className={grado.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "bg-slate-100 text-slate-500"}>
                  {grado.activo ? "Activo" : "Inactivo"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  Sede: <span className="font-medium text-slate-700 dark:text-slate-300">{grado.sedes?.nombre}</span>
                </div>

                {details && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                      <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                      <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{details.totalEstudiantes}</div>
                      <div className="text-[10px] uppercase tracking-wider text-indigo-500/80 font-semibold">Alumnos</div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                      <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400 mb-1" />
                      <div className="text-lg font-bold text-violet-700 dark:text-violet-300">{details.totalCursos}</div>
                      <div className="text-[10px] uppercase tracking-wider text-violet-500/80 font-semibold">Cursos</div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <User className="h-5 w-5 text-slate-600 dark:text-slate-400 mb-1" />
                      <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{details.profesores.length}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500/80 font-semibold">Docentes</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => handleEdit(grado)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(grado.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {grados.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No hay grados registrados</h3>
            <p className="text-slate-500 max-w-sm mt-2 mb-6">
              Comience creando los grados y secciones para su institución educativa.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Grado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
