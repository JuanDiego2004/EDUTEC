"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { useAuth, UserRole } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import { useToast } from "@/ganchos/use-toast";
import { useRouter } from "next/navigation";

import { GraduationCap } from "lucide-react";

const Auth = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("estudiante");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, role } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }

    } else {
      const { error } = await signUp(email, password, selectedRole);
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registro exitoso",
          description: "Por favor verifica tu correo electrónico.",
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 text-black">
      <Card className="w-full max-w-md shadow-xl border rounded-2xl animate-in fade-in duration-300">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl shadow-md">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>

          <CardTitle className="text-3xl font-semibold tracking-tight">
            Edu Class
          </CardTitle>

          <CardDescription className="text-base">
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea una nueva cuenta"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ROL */}
            {!isLogin && (
              <div className="space-y-1">
                <Label className="font-medium">Tipo de Usuario</Label>
                <Select value={selectedRole || undefined} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger className="rounded-xl border">
                    <SelectValue placeholder="Selecciona tu rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estudiante">Estudiante</SelectItem>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* EMAIL */}
            <div className="space-y-1">
              <Label className="font-medium">Correo electrónico</Label>
              <Input
                type="email"
                placeholder="ejemplo@email.com"
                className="rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-1">
              <Label className="font-medium">Contraseña</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full rounded-xl py-5 text-base" disabled={loading}>
              {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isLogin
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

};

export default Auth;
