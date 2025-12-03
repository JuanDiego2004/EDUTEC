"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import {
  GraduationCap, Users, BookOpen, DollarSign, BarChart3,
  UserCheck, BookMarked, LogOut, UserPlus, DoorOpen,
  Calendar as CalendarIcon, Activity, Settings, Bell,
  ChevronRight, Menu, X, Search
} from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { useAuth } from "@/funcionalidades/autenticacion/ganchos/useAuth";
import Dashboard from "@/funcionalidades/administracion/componentes/Dashboard";
import Estudiantes from "@/funcionalidades/estudiantes/componentes/Estudiantes";
import Matriculas from "@/funcionalidades/estudiantes/componentes/Matriculas";
import Pagos from "@/funcionalidades/finanzas/componentes/Pagos";
import PlanesPago from "@/funcionalidades/finanzas/componentes/PlanesPago";
import RegistrarPago from "@/funcionalidades/finanzas/componentes/RegistrarPago";
import Evaluaciones from "@/funcionalidades/academico/componentes/Evaluaciones";
import Cursos from "@/funcionalidades/academico/componentes/Cursos";
import GestionUsuarios from "@/funcionalidades/administracion/componentes/GestionUsuarios";
import { CicloAcademico } from "@/funcionalidades/academico/componentes/CicloAcademico";
import { Salones } from "@/funcionalidades/academico/componentes/Salones";
import LogsViewer from "@/funcionalidades/administracion/componentes/LogsViewer";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentes/ui/avatar";
import Profesores from "@/funcionalidades/profesores/componentes/Profesores";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();

  const navigationItems = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard", color: "from-blue-500 to-cyan-500" },
    { id: "usuarios", icon: UserPlus, label: "Usuarios", color: "from-green-500 to-emerald-500" },
    { id: "estudiantes", icon: Users, label: "Estudiantes", color: "from-purple-500 to-pink-500" },
    { id: "profesores", icon: UserCheck, label: "Profesores", color: "from-orange-500 to-red-500" },
    { id: "cursos", icon: BookMarked, label: "Cursos", color: "from-indigo-500 to-purple-500" },
    { id: "matriculas", icon: BookOpen, label: "Matrículas", color: "from-teal-500 to-cyan-500" },
    { id: "pagos", icon: DollarSign, label: "Pagos", color: "from-lime-500 to-green-500" },
    { id: "academico", icon: GraduationCap, label: "Académico", color: "from-amber-500 to-yellow-500" },
    { id: "ciclos", icon: CalendarIcon, label: "Ciclo Académico", color: "from-rose-500 to-pink-500" },
    { id: "salones", icon: DoorOpen, label: "Salones", color: "from-violet-500 to-purple-500" },
    { id: "logs", icon: Activity, label: "Logs", color: "from-gray-500 to-slate-500" },
  ];

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AD';
  };

  return (
    <div className="min-h-screen text-black dark:text-white bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 dark:from-slate-950 dark:via-blue-950/10 dark:to-emerald-950/10">

      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    EDU CLASS
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Panel de Administración</p>
                </div>
              </div>
            </div>


            <div className="flex items-center gap-3">


              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-slate-200 dark:border-slate-700">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {getInitials(user?.user_metadata?.full_name || user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.user_metadata?.full_name || user?.email || 'Administrador'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.role || 'Admin'}
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={signOut} className="hidden sm:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">

              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 group ${isActive
                        ? "bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700"
                        : "hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className={`font-medium ${isActive
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                          }`}>
                          {item.label}
                        </span>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <Card className="mt-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-0">
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <div className="p-2 bg-white dark:bg-slate-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                      <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Sistema Activo
                    </p>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Online
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
              <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        EDU CLASS
                      </h1>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

  
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-10 bg-slate-100/50 dark:bg-slate-800/50 border-0"
                  />
                </div>

                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === item.id
                          ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

      
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          )}


          <main className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
              <span className="text-slate-400">Dashboard</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                {activeTab.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-6">
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "usuarios" && <GestionUsuarios />}
              {activeTab === "estudiantes" && <Estudiantes />}
              {activeTab === "profesores" && <Profesores />}
              {activeTab === "cursos" && <Cursos />}
              {activeTab === "matriculas" && <Matriculas />}
              {activeTab === "pagos" && (
                <div className="space-y-4">
                  <PlanesPago />
                  <RegistrarPago />
                  <Pagos />
                </div>
              )}
              {activeTab === "academico" && <Evaluaciones />}
              {activeTab === "ciclos" && <CicloAcademico />}
              {activeTab === "salones" && <Salones />}
              {activeTab === "logs" && <LogsViewer />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;