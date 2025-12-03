import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ModalVerNotasProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    estudianteSeleccionado: any;
    onEditarEvaluacion: (id: string, nota: number) => void;
    onEliminarEvaluacion: (id: string) => void;
    editandoEvaluacion: string | null;
    setEditandoEvaluacion: (id: string | null) => void;
}

export function ModalVerNotas({
    open,
    onOpenChange,
    estudianteSeleccionado,
    onEditarEvaluacion,
    onEliminarEvaluacion,
    editandoEvaluacion,
    setEditandoEvaluacion,
}: ModalVerNotasProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Notas de {estudianteSeleccionado?.apellidos}, {estudianteSeleccionado?.nombres}
                    </DialogTitle>
                </DialogHeader>
                {estudianteSeleccionado && (
                    <div className="space-y-6">
                        {/* Agrupar evaluaciones por nombre */}
                        {(() => {
                            const evaluacionesPorNombre: Record<string, any[]> = {};

                            // Agrupar por el nombre de la evaluación (extraer el nombre antes del " - ")
                            estudianteSeleccionado.evaluaciones?.forEach((ev: any) => {
                                const nombreEval = ev.tipo_evaluacion.split(" - ")[0] || ev.tipo_evaluacion;
                                if (!evaluacionesPorNombre[nombreEval]) {
                                    evaluacionesPorNombre[nombreEval] = [];
                                }
                                evaluacionesPorNombre[nombreEval].push(ev);
                            });

                            // Calcular promedios por evaluación
                            const promediosPorEvaluacion = Object.entries(evaluacionesPorNombre).map(([nombre, evals]) => {
                                const promedio = evals.reduce((acc, ev) => {
                                    return acc + Number(ev.nota) * Number(ev.peso);
                                }, 0);
                                return { nombre, promedio, evaluaciones: evals };
                            });

                            // Calcular promedio general (promedio de los promedios)
                            const promedioGeneral =
                                promediosPorEvaluacion.length > 0
                                    ? promediosPorEvaluacion.reduce((acc, item) => acc + item.promedio, 0) /
                                    promediosPorEvaluacion.length
                                    : 0;

                            return (
                                <>
                                    {/* Resumen del estudiante */}
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">DNI</p>
                                            <p className="font-semibold">{estudianteSeleccionado.dni}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Evaluaciones</p>
                                            <p className="font-semibold">{promediosPorEvaluacion.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Promedio General</p>
                                            <p
                                                className={`text-2xl font-bold ${promedioGeneral >= 10.5 ? "text-green-600" : "text-red-600"
                                                    }`}
                                            >
                                                {promedioGeneral.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Mostrar cada evaluación con su promedio */}
                                    {promediosPorEvaluacion.map(({ nombre, promedio, evaluaciones }) => (
                                        <Card key={nombre} className="border-2">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-lg">{nombre}</CardTitle>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Promedio de esta evaluación</p>
                                                        <p
                                                            className={`text-xl font-bold ${promedio >= 10.5 ? "text-green-600" : "text-red-600"}`}
                                                        >
                                                            {promedio.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Competencia</TableHead>
                                                            <TableHead>Nota</TableHead>
                                                            <TableHead>Peso</TableHead>
                                                            <TableHead>Fecha</TableHead>
                                                            <TableHead className="text-center">Acciones</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {evaluaciones.map((evaluacion: any) => (
                                                            <TableRow key={evaluacion.id}>
                                                                <TableCell>
                                                                    {evaluacion.tipo_evaluacion.split(" - ")[1] || evaluacion.tipo_evaluacion}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {editandoEvaluacion === evaluacion.id ? (
                                                                        <Input
                                                                            type="number"
                                                                            step="0.1"
                                                                            min="0"
                                                                            max="20"
                                                                            defaultValue={evaluacion.nota}
                                                                            className="w-20"
                                                                            onBlur={(e) =>
                                                                                onEditarEvaluacion(evaluacion.id, parseFloat(e.target.value))
                                                                            }
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={`text-lg font-bold ${evaluacion.nota >= 10.5 ? "text-green-600" : "text-red-600"
                                                                                }`}
                                                                        >
                                                                            {evaluacion.nota}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{(evaluacion.peso * 100).toFixed(0)}%</TableCell>
                                                                <TableCell>
                                                                    {evaluacion.fecha_evaluacion
                                                                        ? format(new Date(evaluacion.fecha_evaluacion), "dd/MM/yyyy")
                                                                        : "-"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => setEditandoEvaluacion(evaluacion.id)}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => onEliminarEvaluacion(evaluacion.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </>
                            );
                        })()}

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
