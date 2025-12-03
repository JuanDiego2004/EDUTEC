import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { supabase } from "@/servicios/base-datos/supabase";
import { GraduationCap, Eye, BookOpen, Users, Award } from "lucide-react";
import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/ui/dialog";
import { Badge } from "@/componentes/ui/badge";
import { Label } from "@/componentes/ui/label";

interface CursoEstudiante {
  estudiante_id: string;
  nombres: string;
  apellidos: string;
  promedio: number;
  notas: Array<{
    competencia: string;
    nota: number;
    porcentaje: number;
  }>;
}

const Evaluaciones = () => {
  const [selectedSalon, setSelectedSalon] = useState<string>("all");
  const [viewCursoModal, setViewCursoModal] = useState(false);
  const [selectedCursoData, setSelectedCursoData] = useState<{
    curso_nombre: string;
    estudiantes: CursoEstudiante[];
    competencias: Array<{ nombre: string; porcentaje: number }>;
  } | null>(null);

  const { data: salones } = useQuery({
    queryKey: ["salones-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salones")
        .select("id, codigo, nombre, grado, seccion, nivel")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
    enabled: typeof window !== 'undefined',
  });

  const { data: cursosPorSalon, isLoading } = useQuery({
    queryKey: ["cursos-por-salon", selectedSalon],
    queryFn: async () => {
      if (selectedSalon === "all") return [];

      // Obtener los cursos del salón
      const { data: salonCursos, error: errorSalonCursos } = await supabase
        .from("salon_cursos")
        .select(`
          id,
          curso_id,
          cursos(id, nombre, codigo)
        `)
        .eq("salon_id", selectedSalon)
        .eq("activo", true);

      if (errorSalonCursos) throw errorSalonCursos;

      // Para cada curso, obtener estudiantes y promedios
      const cursosConDatos = await Promise.all(
        (salonCursos || []).map(async (sc: any) => {
          const cursoId = sc.cursos.id;

          // Obtener estudiantes matriculados en este curso
          const { data: matriculas, error: errorMatriculas } = await supabase
            .from("matriculas")
            .select(`
              id,
              estudiante_id,
              estudiantes(nombres, apellidos),
              estado_academico(promedio)
            `)
            .eq("curso_id", cursoId)
            .eq("estado", "activa");

          if (errorMatriculas) throw errorMatriculas;

          // Calcular promedio general de todos los estudiantes
          const promedios = matriculas?.map((m: any) =>
            Number(m.estado_academico?.[0]?.promedio || 0)
          ) || [];

          const promedioGeneral = promedios.length > 0
            ? promedios.reduce((a, b) => a + b, 0) / promedios.length
            : 0;

          return {
            salon_curso_id: sc.id,
            curso_id: cursoId,
            curso_nombre: sc.cursos.nombre,
            curso_codigo: sc.cursos.codigo,
            total_estudiantes: matriculas?.length || 0,
            promedio_general: promedioGeneral,
            matriculas: matriculas || [],
          };
        })
      );

      return cursosConDatos;
    },
    enabled: selectedSalon !== "all" && typeof window !== 'undefined',
  });

  const handleVerEstudiantes = async (curso: any) => {
    try {
      // Obtener competencias del curso
      const { data: competencias, error: errorComp } = await supabase
        .from("competencias")
        .select("id, nombre, porcentaje")
        .eq("salon_curso_id", curso.salon_curso_id);

      if (errorComp) throw errorComp;

      // Procesar cada estudiante con sus notas por competencia
      const estudiantesConNotas = await Promise.all(
        curso.matriculas.map(async (matricula: any) => {
          const notasPorCompetencia = await Promise.all(
            (competencias || []).map(async (comp: any) => {
              // Buscar evaluaciones del estudiante en esta competencia
              const { data: evaluaciones } = await supabase
                .from("evaluaciones")
                .select("nota")
                .eq("matricula_id", matricula.id)
                .eq("tipo_evaluacion", comp.nombre);

              const nota = evaluaciones && evaluaciones.length > 0
                ? Number((evaluaciones as any[])[0].nota)
                : 0;

              return {
                competencia: comp.nombre,
                nota: nota,
                porcentaje: Number(comp.porcentaje),
              };
            })
          );

          return {
            estudiante_id: matricula.estudiante_id,
            nombres: matricula.estudiantes.nombres,
            apellidos: matricula.estudiantes.apellidos,
            promedio: Number(matricula.estado_academico?.[0]?.promedio || 0),
            notas: notasPorCompetencia,
          };
        })
      );

      setSelectedCursoData({
        curso_nombre: curso.curso_nombre,
        estudiantes: estudiantesConNotas,
        competencias: competencias || [],
      });
      setViewCursoModal(true);
    } catch (error) {
      console.error("Error al cargar datos del curso:", error);
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
              Evaluaciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Seguimiento de rendimiento académico por salón y curso
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden mb-8">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Rendimiento por Salón</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Selecciona un salón para ver el detalle de cursos
                </CardDescription>
              </div>
            </div>
            <div className="w-full md:w-72">
              <Select value={selectedSalon} onValueChange={setSelectedSalon}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Seleccione un salón" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seleccionar salón</SelectItem>
                  {(salones as any[])?.map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      {salon.codigo} - {salon.grado} {salon.seccion} ({salon.nivel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedSalon === "all" ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <BookOpen className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium">Seleccione un salón para comenzar</p>
                <p className="text-sm max-w-sm mx-auto">
                  Elija un salón del desplegable superior para ver el rendimiento académico de sus cursos asignados.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-slate-500">Cargando cursos...</div>
          ) : cursosPorSalon && cursosPorSalon.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Código</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Curso</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estudiantes</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Promedio General</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600 dark:text-slate-300">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cursosPorSalon.map((curso: any) => (
                  <TableRow key={curso.curso_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">{curso.curso_codigo}</TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{curso.curso_nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Users className="h-4 w-4 text-slate-400" />
                        {curso.total_estudiantes}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${curso.promedio_general >= 10.5
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
                          }`}
                      >
                        {curso.promedio_general.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        onClick={() => handleVerEstudiantes(curso)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Estudiantes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <p>No hay cursos asignados a este salón</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para ver estudiantes del curso */}
      <Dialog open={viewCursoModal} onOpenChange={setViewCursoModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-500" />
              {selectedCursoData?.curso_nombre}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Detalle de notas y promedios por estudiante
            </DialogDescription>
          </DialogHeader>

          {selectedCursoData && (
            <div className="space-y-6 mt-4">
              {selectedCursoData.competencias.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Award className="h-4 w-4 text-indigo-500" />
                    Competencias Evaluadas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCursoData.competencias.map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-1.5 px-3">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400 mr-1">{comp.porcentaje}%</span>
                        {comp.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Estudiante</TableHead>
                      {selectedCursoData.competencias.map((comp, idx) => (
                        <TableHead key={idx} className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{comp.nombre}</span>
                            <span className="text-xs text-slate-400 font-normal">({comp.porcentaje}%)</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-bold text-slate-700 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-800/50">Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCursoData.estudiantes.map((estudiante) => (
                      <TableRow key={estudiante.estudiante_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                          {estudiante.apellidos}, {estudiante.nombres}
                        </TableCell>
                        {estudiante.notas.map((nota, idx) => (
                          <TableCell key={idx} className="text-center">
                            <span className={`font-semibold ${nota.nota >= 10.5 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              }`}>
                              {nota.nota.toFixed(2)}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <Badge
                            className={`${estudiante.promedio >= 10.5
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                              }`}
                          >
                            {estudiante.promedio.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Evaluaciones;
