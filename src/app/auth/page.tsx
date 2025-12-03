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
import { GraduationCap, ArrowRight, User, Lock, Mail, Loader2, Sparkles } from "lucide-react";

const Auth = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("estudiante");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          title: "Error de acceso",
          description: error.message,
          variant: "destructive",
        });
      }

    } else {
      const { error } = await signUp(email, password, selectedRole);
      if (error) {
        toast({
          title: "Error de registro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "¡Registro exitoso!",
          description: "Por favor verifica tu correo electrónico para continuar.",
          className: "bg-emerald-500 text-white border-none",
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-emerald-400/20 blur-[100px] animate-pulse delay-700" />
      </div>

      {/* Glassmorphism Card */}
      <Card className="w-full max-w-md relative z-10 border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 animate-in fade-in zoom-in duration-500">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

        <CardHeader className="text-center space-y-4 pb-6 relative">
          <div className="flex justify-center mb-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative p-4 bg-white rounded-2xl border border-indigo-50 shadow-lg">
                <GraduationCap className="h-10 w-10 text-indigo-600" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-6 w-6 text-yellow-500 animate-bounce" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold tracking-tight text-slate-900">
              Edu Class
            </CardTitle>
            <CardDescription className="text-slate-600 text-lg font-medium">
              {isLogin ? "Bienvenido de nuevo" : "Únete a nuestra comunidad"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ROL SELECTION */}
            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                <Label className="text-slate-700 font-semibold">¿Cómo deseas registrarte?</Label>
                <Select value={selectedRole || undefined} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger className="h-12 bg-white border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl transition-all hover:bg-slate-50 shadow-sm">
                    <SelectValue placeholder="Selecciona tu rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-lg">
                    <SelectItem value="estudiante" className="focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-500" /> Estudiante
                      </div>
                    </SelectItem>
                    <SelectItem value="profesor" className="focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-indigo-500" /> Profesor
                      </div>
                    </SelectItem>
                    <SelectItem value="admin" className="focus:bg-indigo-50 focus:text-indigo-700 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-indigo-500" /> Administrador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* EMAIL INPUT */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Correo electrónico</Label>
              <div className="relative group">
                <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  className="pl-10 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-slate-50 shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Contraseña</Label>
              <div className="relative group">
                <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-slate-50 shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>

          <div className="pt-4 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-slate-500 font-medium">O continúa con</span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
            >
              {isLogin ? (
                <>¿No tienes cuenta? <span className="text-indigo-600 ml-1 font-bold hover:underline">Regístrate gratis</span></>
              ) : (
                <>¿Ya tienes cuenta? <span className="text-indigo-600 ml-1 font-bold hover:underline">Inicia sesión</span></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-center text-slate-500 text-sm font-medium">
        © 2025 Edu Class. Todos los derechos reservados.
      </div>
    </div>
  );
};

export default Auth;
