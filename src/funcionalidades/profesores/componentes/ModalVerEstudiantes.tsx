import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Salon, Estudiante } from "@/funcionalidades/profesores/tipos/profesores.tipos";

interface ModalVerEstudiantesProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedSalon: Salon | null;
    estudiantesDelSalon: Estudiante[];
}

export function ModalVerEstudiantes({
    open,
    onOpenChange,
    selectedSalon,
    estudiantesDelSalon,
}: ModalVerEstudiantesProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Estudiantes del Salón {selectedSalon?.codigo}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>DNI</TableHead>
                                <TableHead>Apellidos</TableHead>
                                <TableHead>Nombres</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {estudiantesDelSalon.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                        No hay estudiantes registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                estudiantesDelSalon.map((estudiante) => (
                                    <TableRow key={estudiante.id}>
                                        <TableCell>{estudiante.dni}</TableCell>
                                        <TableCell>{estudiante.apellidos}</TableCell>
                                        <TableCell>{estudiante.nombres}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
