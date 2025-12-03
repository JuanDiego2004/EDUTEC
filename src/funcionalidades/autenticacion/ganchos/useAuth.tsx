"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/servicios/base-datos/supabase";
import { useRouter } from "next/navigation";
import { activityLogger } from "@/servicios/logger/registroActividad";
import { toast } from "sonner";

// Roles en español para el frontend
export type UserRole = "admin" | "profesor" | "estudiante" | null;

// Roles en inglés para Supabase
type SupabaseRole = "admin" | "teacher" | "student";

//  Función para mapear roles
const mapRoleToSupabase = (role: UserRole): SupabaseRole | null => {
  if (role === "profesor") return "teacher";
  if (role === "estudiante") return "student";
  if (role === "admin") return "admin";
  return null;
};

const mapRoleFromSupabase = (role: SupabaseRole): UserRole => {
  if (role === "teacher") return "profesor";
  if (role === "student") return "estudiante";
  if (role === "admin") return "admin";
  return null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, role: UserRole) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------
  // AUTH LISTENER
  // -------------------------------------------
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          //  Convertir de inglés a español
          const supabaseRole = (data as any)?.role as SupabaseRole;
          const userRole = mapRoleFromSupabase(supabaseRole);
          setRole(userRole);

          // Protección de rutas: redirigir si está en una ruta incorrecta
          const currentPath = window.location.pathname;
          if (currentPath !== '/auth') {
            if (userRole === 'admin' && !currentPath.startsWith('/admin')) {
              router.push('/admin');
            } else if (userRole === 'profesor' && !currentPath.startsWith('/profesor')) {
              router.push('/profesor');
            } else if (userRole === 'estudiante' && !currentPath.startsWith('/estudiante')) {
              router.push('/estudiante');
            }
          }
        } else {
          setRole(null);
          // Si no hay sesión y no está en /auth, redirigir a login
          if (window.location.pathname !== '/auth') {
            router.push('/auth');
          }
        }

        setLoading(false);
      }
    );

    // load initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        //  Convertir de inglés a español
        const supabaseRole = (data as any)?.role as SupabaseRole;
        setRole(mapRoleFromSupabase(supabaseRole));
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // -------------------------------------------
  // SIGN IN
  // -------------------------------------------
  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    console.log(" Intentando login con:", email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      console.log(" Login exitoso");
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session?.user) {
        const uid = sessionData.session.user.id;
        console.log("👤 User ID:", uid);

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .single();

        //  Convertir de inglés a español
        const supabaseRole = (data as any)?.role as SupabaseRole;
        const uRole = mapRoleFromSupabase(supabaseRole);
        console.log(" Rol obtenido:", uRole);

        setRole(uRole);

        // Registrar login exitoso en MongoDB
        await activityLogger.logLogin(uid, email, uRole ?? "desconocido");

        // Las redirecciones ahora las maneja el onAuthStateChange automáticamente
        // Solo esperamos un momento para que la sesión se sincronice
        setTimeout(() => {
          if (uRole === "admin") {
            router.push("/admin");
          } else if (uRole === "profesor") {
            router.push("/profesor");
          } else if (uRole === "estudiante") {
            router.push("/estudiante");
          }
        }, 100);
      }
    } else {
      console.error("Error de login:", error);
      // Registrar intento fallido en MongoDB
      await activityLogger.logFailedLogin(email, error.message);

      // Notificar al usuario
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Credenciales incorrectas. Verifique su correo y contraseña.");
      } else {
        toast.error(`Error de inicio de sesión: ${error.message}`);
      }
    }

    return { error };
  };

  // -------------------------------------------
  // SIGN UP
  // -------------------------------------------
  const signUp = async (
    email: string,
    password: string,
    role: UserRole
  ): Promise<{ error: AuthError | null }> => {
    try {
      //  Convertir rol español a inglés para Supabase
      const supabaseRole = mapRoleToSupabase(role);

      if (!supabaseRole) {
        return { error: new Error("Rol inválido") as AuthError };
      }

      //  NUEVO: Crear usuario en AMBAS bases de datos
      const response = await fetch('/api/auth/crear-usuario-dual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role: supabaseRole,
          metadata: {}
        })
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || 'Error creando usuario');
      }

      // Registrar signup en MongoDB
      await activityLogger.log({
        idUsuario: resultado.userId,
        correoUsuario: email,
        rolUsuario: role ?? "desconocido",
        tipoActividad: "registro",
        modulo: "auth",
        descripcion: `Nuevo usuario registrado en ambas bases: ${email} con rol ${role}`,
        exito: true,
        metadata: { registration_method: "email", dual_creation: true },
      });

      toast.success("Usuario creado exitosamente. Por favor inicie sesión.");

      return { error: null };

    } catch (error) {
      console.error('Error en signUp dual:', error);

      // Registrar signup fallido en MongoDB
      await activityLogger.log({
        idUsuario: "unknown",
        correoUsuario: email,
        rolUsuario: role ?? "desconocido",
        tipoActividad: "registro",
        modulo: "auth",
        descripcion: `Intento fallido de registro: ${email}`,
        exito: false,
        metadata: {
          registration_method: "email",
          error_message: (error as Error).message
        },
      });

      toast.error(`Error al crear usuario: ${(error as Error).message}`);

      return { error: error as AuthError };
    }
  };

  // -------------------------------------------
  // SIGN OUT
  // -------------------------------------------
  const signOut = async () => {
    if (user?.id && user?.email) {
      //  Registrar logout con rol en español
      await activityLogger.logLogout(user.id, user.email, role ?? "desconocido");
    }

    await supabase.auth.signOut();

    setRole(null);
    // Usar window.location.href para forzar recarga completa y limpiar estado
    window.location.href = "/auth";
  };

  // -------------------------------------------
  // PROVIDER RETURN
  // -------------------------------------------
  return (
    <AuthContext.Provider
      value={{ user, session, role, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// -------------------------------------------
// CUSTOM HOOK
// -------------------------------------------
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};