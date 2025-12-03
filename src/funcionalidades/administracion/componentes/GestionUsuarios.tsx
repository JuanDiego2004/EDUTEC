"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";
import { useToast } from "@/ganchos/use-toast";
import { supabase } from "@/servicios/base-datos/supabase";
import { UserPlus, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/componentes/ui/badge";
import { Profesor, Profile, UserData, UserRole, UserRoleRow } from "@/tipos/comunes.tipos";
import { usePathname } from "next/navigation";

interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
}


const GestionUsuarios = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [profesorId, setProfesorId] = useState<string>("");
  const [estudianteId, setEstudianteId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const { data: profesores = [], isLoading: loadingProfesores } = useQuery<Profesor[]>({
    queryKey: ["profesores-activos"],
    queryFn: async () => {
      const { data } = await supabase
        .from('profesores')
        .select('id, nombres, apellidos, dni')
        .eq('estado', 'activo');
      return data || [];
    },
    enabled: typeof window !== 'undefined',
  });

  const { data: estudiantes = [], isLoading: loadingEstudiantes } = useQuery<Estudiante[]>({
    queryKey: ["estudiantes-activos-usuarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from('estudiantes')
        .select('id, nombres, apellidos, dni')
        .eq('estado', 'activo');
      return data || [];
    },
    enabled: typeof window !== 'undefined',
  });


  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<UserData[]>({
    queryKey: ["usuarios-sistema"],
    queryFn: async () => {

      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (rolesError) throw rolesError;

      // Obtener usuarios de auth usando el endpoint API (con service role)
      const response = await fetch('/api/admin/users/list');
      if (!response.ok) {
        throw new Error('Error fetching auth users');
      }
      const { users: authUsers } = await response.json();


      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, profesor_id, estudiante_id');

      const usersWithDetails = await Promise.all(
        ((userRolesData as any[]) || []).map(async ur => {
          const authUser = authUsers?.find((u: any) => u.id === ur.user_id);
          const profile = profilesData?.find((p: Profile) => p.user_id === ur.user_id);

          let profesor_nombre, estudiante_nombre;

          if ((profile as any)?.profesor_id) {
            const { data: prof } = await supabase
              .from('profesores')
              .select('nombres, apellidos')
              .eq('id', (profile as any).profesor_id)
              .maybeSingle();
            if (prof) profesor_nombre = `${(prof as any).nombres} ${(prof as any).apellidos}`;
          }

          if ((profile as any)?.estudiante_id) {
            const { data: est } = await supabase
              .from('estudiantes')
              .select('nombres, apellidos')
              .eq('id', (profile as any).estudiante_id)
              .maybeSingle();
            if (est) estudiante_nombre = `${(est as any).nombres} ${(est as any).apellidos}`;
          }

          return {
            user_id: ur.user_id,
            email: authUser?.email || 'N/A',
            role: ur.role,
            profesor_nombre,
            estudiante_nombre,
            created_at: ur.created_at
          };
        })
      );

      return usersWithDetails;
    },
    enabled: typeof window !== 'undefined',
    staleTime: 0,
    refetchOnMount: true,
  });

  const loadingData = loadingProfesores || loadingEstudiantes;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();


    if (role === 'teacher' && !profesorId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un profesor",
        variant: "destructive",
      });
      return;
    }

    if (role === 'student' && !estudianteId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un estudiante",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {

      const response = await fetch('/api/auth/crear-usuario-dual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
          metadata: {
            profesor_id: role === 'teacher' ? profesorId : undefined,
            estudiante_id: role === 'student' ? estudianteId : undefined
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      if (data.success) {
        toast({
          title: "Usuario creado",
          description: `Usuario ${email} creado exitosamente en ambas bases de datos`,
        });
        setEmail("");
        setPassword("");
        setRole("student");
        setProfesorId("");
        setEstudianteId("");
        setIsDialogOpen(false);


        queryClient.invalidateQueries({ queryKey: ["usuarios-sistema"] });
        queryClient.invalidateQueries({ queryKey: ["estudiantes"] });
        queryClient.invalidateQueries({ queryKey: ["estudiantes-activos-usuarios"] });
        queryClient.invalidateQueries({ queryKey: ["profesores"] });
        queryClient.invalidateQueries({ queryKey: ["profesores-activos"] });

        refetchUsers();
      } else {
        throw new Error(data.error || "Error al crear usuario");
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      });
      refetchUsers();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default'
      case 'student': return 'secondary';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8">
      {/* Header moderno */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-1 h-16 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Gestión de Usuarios
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Administra cuentas y permisos del sistema
              </p>
            </div>
          </div>

          {/* Botón crear con diseño moderno */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>

            {/* Dialog con diseño mejorado */}
            <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-0 shadow-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl text-slate-900 dark:text-white">
                      Nuevo Usuario
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                      Crea una cuenta y asigna permisos
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-5 mt-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 rounded-xl transition-colors"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 rounded-xl transition-colors"
                    required
                    minLength={6}
                  />
                </div>

                {/* Rol */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-medium">
                    Rol del Usuario
                  </Label>
                  <Select value={role} onValueChange={(value) => {
                    setRole(value as UserRole);
                    setProfesorId("");
                    setEstudianteId("");
                  }}>
                    <SelectTrigger className="h-12 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      <SelectItem value="student" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Estudiante
                        </div>
                      </SelectItem>
                      <SelectItem value="teacher" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Profesor
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vinculación Profesor */}
                {role === 'teacher' && (
                  <div className="space-y-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800">
                    <Label htmlFor="profesor" className="text-emerald-700 dark:text-emerald-300 font-medium">
                      Vincular con Profesor
                    </Label>
                    <Select value={profesorId} onValueChange={setProfesorId} disabled={loadingData}>
                      <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl">
                        <SelectValue placeholder={loadingData ? "Cargando..." : "Selecciona un profesor"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        {profesores.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id} className="rounded-lg">
                            {prof.nombres} {prof.apellidos} - DNI: {prof.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Vinculación Estudiante */}
                {role === 'student' && (
                  <div className="space-y-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
                    <Label htmlFor="estudiante" className="text-blue-700 dark:text-blue-300 font-medium">
                      Vincular con Estudiante
                    </Label>
                    <Select value={estudianteId} onValueChange={setEstudianteId} disabled={loadingData}>
                      <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-700 rounded-xl">
                        <SelectValue placeholder={loadingData ? "Cargando..." : "Selecciona un estudiante"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        {estudiantes.map((est) => (
                          <SelectItem key={est.id} value={est.id} className="rounded-lg">
                            {est.nombres} {est.apellidos} - DNI: {est.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card principal con lista de usuarios */}
      <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-900 dark:text-white">
                Usuarios Registrados
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {users.length} usuarios en el sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No hay usuarios aún
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Crea el primer usuario para comenzar
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">Rol</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">Vinculado a</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">Fecha Creación</TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow
                      key={user.user_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          className="rounded-full px-3 py-1 font-medium"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {user.profesor_nombre || user.estudiante_nombre || (
                          <span className="text-slate-400 dark:text-slate-500">Sin vincular</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.user_id)}
                          className="h-10 w-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionUsuarios;
