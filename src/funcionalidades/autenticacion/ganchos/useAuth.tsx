"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabaseAuth } from "@/servicios/base-datos/supabaseAuth";
import { supabaseFailover } from "@/servicios/base-datos/supabaseConRespaldo";
import { useRouter } from "next/navigation";
import { activityLogger } from "@/servicios/logger/registroActividad";
import { toast } from "sonner";


export type UserRole = "admin" | "profesor" | "estudiante" | null;


type SupabaseRole = "admin" | "teacher" | "student";


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

  
  
  
  useEffect(() => {
    
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          
          const cliente = supabaseFailover.getDirectClient();
          const { data } = await cliente
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          
          const supabaseRole = (data as any)?.role as SupabaseRole;
          const userRole = mapRoleFromSupabase(supabaseRole);
          setRole(userRole);

          
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
          
          if (window.location.pathname !== '/auth') {
            router.push('/auth');
          }
        }

        setLoading(false);
      }
    );

    
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        
        const cliente = supabaseFailover.getDirectClient();
        const { data } = await cliente
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        
        const supabaseRole = (data as any)?.role as SupabaseRole;
        setRole(mapRoleFromSupabase(supabaseRole));
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  
  
  
  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    console.log("🔐 [Auth] Intentando login con:", email);
    
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (!error) {
      console.log(" [Auth] Login exitoso");
      const { data: sessionData } = await supabaseAuth.auth.getSession();

      if (sessionData.session?.user) {
        const uid = sessionData.session.user.id;
        console.log("👤 User ID:", uid);

        
        const cliente = supabaseFailover.getDirectClient();
        const { data } = await cliente
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .single();

        
        const supabaseRole = (data as any)?.role as SupabaseRole;
        const uRole = mapRoleFromSupabase(supabaseRole);
        console.log(" Rol obtenido:", uRole);

        setRole(uRole);

        
        await activityLogger.logLogin(uid, email, uRole ?? "desconocido");

        
        
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
      
      await activityLogger.logFailedLogin(email, error.message);

      
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Credenciales incorrectas. Verifique su correo y contraseña.");
      } else {
        toast.error(`Error de inicio de sesión: ${error.message}`);
      }
    }

    return { error };
  };

  
  
  
  const signUp = async (email: string, password: string, role: UserRole): Promise<{ error: AuthError | null }> => {
    console.log("📝 [Auth] Intentando registro con:", email, "Role:", role);

    
    const supabaseRole = mapRoleToSupabase(role);

    if (!supabaseRole) {
      console.error(" Rol inválido:", role);
      return { error: new Error("Rol inválido") as any };
    }

    
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      console.log(" [Auth] Usuario creado exitosamente en Supabase Auth");
      console.log("📊 Insertando rol en user_roles en AMBAS bases...");

      
      
      const { error: roleError } = await supabaseFailover.insert(
        "user_roles",
        { user_id: data.user.id, role: supabaseRole }
      );

      if (roleError) {
        console.error(" Error insertando rol:", roleError);

        
        
        console.warn(" Usuario creado pero sin rol asignado - se requiere limpieza manual");

        await activityLogger.log({
          idUsuario: data.user.id,
          correoUsuario: email,
          rolUsuario: role ?? "desconocido",
          tipoActividad: "registro",
          modulo: "auth",
          descripcion: `Usuario creado pero falló la asignación de rol: ${email} con rol ${role}`,
          exito: false,
          metadata: { registration_method: "email", role_insertion_error: roleError.message },
        });

        toast.error(`Error al asignar rol al usuario: ${roleError.message}`);
        return { error: roleError as AuthError };
      }

      console.log(" Rol insertado exitosamente en user_roles.");

      
      await activityLogger.log({
        idUsuario: data.user.id,
        correoUsuario: email,
        rolUsuario: role ?? "desconocido",
        tipoActividad: "registro",
        modulo: "auth",
        descripcion: `Nuevo usuario registrado y rol asignado: ${email} con rol ${role}`,
        exito: true,
        metadata: { registration_method: "email" },
      });

      toast.success("Usuario creado exitosamente. Por favor inicie sesión.");

      return { error: null };

    } else {
      console.error('Error en signUp:', error);

      
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
          error_message: error?.message
        },
      });

      toast.error(`Error al crear usuario: ${error?.message}`);

      return { error: error as AuthError };
    }
  };

  
  
  
  const signOut = async () => {
    console.log("🚪 [Auth] Cerrando sesión...");

    
    if (user) {
      await activityLogger.logLogout(user.id, user.email ?? "unknown", role ?? "unknown");
    }

    
    await supabaseAuth.auth.signOut();

    setRole(null);
    
    window.location.href = "/auth";
  };

  
  
  
  return (
    <AuthContext.Provider
      value={{ user, session, role, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};




export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};