import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { supabase } from "@/servicios/base-datos/supabase";
import { Package } from "lucide-react";

const Inventario = () => {
  const { data: inventario, isLoading } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("*, sedes(nombre)")
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Gestión de Inventario</CardTitle>
            <CardDescription>Control de materiales con bloqueo FOR UPDATE</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Cargando inventario...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Precio Unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(inventario as any[])?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo_material}</TableCell>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell className="capitalize">{item.tipo_material}</TableCell>
                  <TableCell>{item.sedes?.nombre}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${item.stock > 10
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                      {item.stock} unidades
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">S/ {Number(item.precio_unitario).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Inventario;
