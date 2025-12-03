export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      asistencias: {
        Row: {
          created_at: string | null
          fecha: string
          id: string
          justificacion: string | null
          matricula_id: string
          presente: boolean | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          id?: string
          justificacion?: string | null
          matricula_id: string
          presente?: boolean | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          id?: string
          justificacion?: string | null
          matricula_id?: string
          presente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_academicos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      competencias: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          porcentaje: number
          salon_curso_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          porcentaje: number
          salon_curso_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          porcentaje?: number
          salon_curso_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competencias_salon_curso_id_fkey"
            columns: ["salon_curso_id"]
            isOneToOne: false
            referencedRelation: "salon_cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      cuotas_pago: {
        Row: {
          concepto: string
          created_at: string | null
          estado: string | null
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          monto: number
          numero_cuota: number
          plan_pago_id: string
          updated_at: string | null
        }
        Insert: {
          concepto: string
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          monto: number
          numero_cuota: number
          plan_pago_id: string
          updated_at?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string | null
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          monto?: number
          numero_cuota?: number
          plan_pago_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuotas_pago_plan_pago_id_fkey"
            columns: ["plan_pago_id"]
            isOneToOne: false
            referencedRelation: "planes_pago"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          creditos: number | null
          descripcion: string | null
          grado_seccion_id: string | null
          id: string
          nivel: string | null
          nombre: string
          profesor_id: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          creditos?: number | null
          descripcion?: string | null
          grado_seccion_id?: string | null
          id?: string
          nivel?: string | null
          nombre: string
          profesor_id?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          creditos?: number | null
          descripcion?: string | null
          grado_seccion_id?: string | null
          id?: string
          nivel?: string | null
          nombre?: string
          profesor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_grado_seccion_id_fkey"
            columns: ["grado_seccion_id"]
            isOneToOne: false
            referencedRelation: "grados_secciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profesores"
            referencedColumns: ["id"]
          },
        ]
      }
      deudas_estudiantes: {
        Row: {
          deuda_pendiente: number | null
          deuda_total: number | null
          estudiante_id: string
          id: string
          ultima_actualizacion: string | null
        }
        Insert: {
          deuda_pendiente?: number | null
          deuda_total?: number | null
          estudiante_id: string
          id?: string
          ultima_actualizacion?: string | null
        }
        Update: {
          deuda_pendiente?: number | null
          deuda_total?: number | null
          estudiante_id?: string
          id?: string
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deudas_estudiantes_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: true
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
        ]
      }
      estado_academico: {
        Row: {
          estado: string | null
          id: string
          matricula_id: string
          promedio: number | null
          ultima_actualizacion: string | null
        }
        Insert: {
          estado?: string | null
          id?: string
          matricula_id: string
          promedio?: number | null
          ultima_actualizacion?: string | null
        }
        Update: {
          estado?: string | null
          id?: string
          matricula_id?: string
          promedio?: number | null
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estado_academico_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: true
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      estudiantes: {
        Row: {
          apellidos: string
          apoderado_apellidos: string | null
          apoderado_direccion: string | null
          apoderado_dni: string | null
          apoderado_edad: number | null
          apoderado_email: string | null
          apoderado_fecha_nacimiento: string | null
          apoderado_nombres: string | null
          apoderado_sexo: string | null
          apoderado_telefono: string | null
          created_at: string | null
          direccion: string | null
          dni: string
          edad: number | null
          email: string | null
          estado: string | null
          fecha_nacimiento: string | null
          id: string
          nombres: string
          sede_id: string
          sexo: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos: string
          apoderado_apellidos?: string | null
          apoderado_direccion?: string | null
          apoderado_dni?: string | null
          apoderado_edad?: number | null
          apoderado_email?: string | null
          apoderado_fecha_nacimiento?: string | null
          apoderado_nombres?: string | null
          apoderado_sexo?: string | null
          apoderado_telefono?: string | null
          created_at?: string | null
          direccion?: string | null
          dni: string
          edad?: number | null
          email?: string | null
          estado?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombres: string
          sede_id: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string
          apoderado_apellidos?: string | null
          apoderado_direccion?: string | null
          apoderado_dni?: string | null
          apoderado_edad?: number | null
          apoderado_email?: string | null
          apoderado_fecha_nacimiento?: string | null
          apoderado_nombres?: string | null
          apoderado_sexo?: string | null
          apoderado_telefono?: string | null
          created_at?: string | null
          direccion?: string | null
          dni?: string
          edad?: number | null
          email?: string | null
          estado?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombres?: string
          sede_id?: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      estudiantes_salones: {
        Row: {
          activo: boolean | null
          estudiante_id: string
          fecha_asignacion: string | null
          id: string
          periodo_academico: string
          salon_id: string
        }
        Insert: {
          activo?: boolean | null
          estudiante_id: string
          fecha_asignacion?: string | null
          id?: string
          periodo_academico: string
          salon_id: string
        }
        Update: {
          activo?: boolean | null
          estudiante_id?: string
          fecha_asignacion?: string | null
          id?: string
          periodo_academico?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudiantes_salones_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estudiantes_salones_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          created_at: string | null
          fecha_evaluacion: string | null
          id: string
          matricula_id: string
          nota: number | null
          observaciones: string | null
          peso: number | null
          tipo_evaluacion: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha_evaluacion?: string | null
          id?: string
          matricula_id: string
          nota?: number | null
          observaciones?: string | null
          peso?: number | null
          tipo_evaluacion?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha_evaluacion?: string | null
          id?: string
          matricula_id?: string
          nota?: number | null
          observaciones?: string | null
          peso?: number | null
          tipo_evaluacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      grados_secciones: {
        Row: {
          activo: boolean | null
          created_at: string | null
          grado: string
          id: string
          nivel: string
          seccion: string
          sede_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          grado: string
          id?: string
          nivel?: string
          seccion: string
          sede_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          grado?: string
          id?: string
          nivel?: string
          seccion?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grados_secciones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          aula: string | null
          created_at: string | null
          curso_id: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          aula?: string | null
          created_at?: string | null
          curso_id: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          aula?: string | null
          created_at?: string | null
          curso_id?: string
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          activo: boolean | null
          codigo_material: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          precio_unitario: number | null
          sede_id: string
          stock: number | null
          tipo_material: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_material: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          precio_unitario?: number | null
          sede_id: string
          stock?: number | null
          tipo_material: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_material?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          precio_unitario?: number | null
          sede_id?: string
          stock?: number | null
          tipo_material?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          created_at: string | null
          curso_id: string
          estado: string | null
          estudiante_id: string
          fecha_matricula: string | null
          grado_seccion_id: string | null
          id: string
          periodo_academico: string
          plan_pago_id: string | null
          sede_id: string
        }
        Insert: {
          created_at?: string | null
          curso_id: string
          estado?: string | null
          estudiante_id: string
          fecha_matricula?: string | null
          grado_seccion_id?: string | null
          id?: string
          periodo_academico: string
          plan_pago_id?: string | null
          sede_id: string
        }
        Update: {
          created_at?: string | null
          curso_id?: string
          estado?: string | null
          estudiante_id?: string
          fecha_matricula?: string | null
          grado_seccion_id?: string | null
          id?: string
          periodo_academico?: string
          plan_pago_id?: string | null
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_grado_seccion_id_fkey"
            columns: ["grado_seccion_id"]
            isOneToOne: false
            referencedRelation: "grados_secciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_plan_pago_id_fkey"
            columns: ["plan_pago_id"]
            isOneToOne: false
            referencedRelation: "planes_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          concepto: string
          created_at: string | null
          estado: string | null
          estudiante_id: string
          fecha_pago: string | null
          id: string
          metodo_pago: string | null
          monto: number
          sede_id: string
        }
        Insert: {
          concepto: string
          created_at?: string | null
          estado?: string | null
          estudiante_id: string
          fecha_pago?: string | null
          id?: string
          metodo_pago?: string | null
          monto: number
          sede_id: string
        }
        Update: {
          concepto?: string
          created_at?: string | null
          estado?: string | null
          estudiante_id?: string
          fecha_pago?: string | null
          id?: string
          metodo_pago?: string | null
          monto?: number
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_pago: {
        Row: {
          activo: boolean | null
          ciclo_academico_id: string | null
          created_at: string | null
          estudiante_id: string | null
          id: string
          nivel: string
          nombre: string
          pagado: number | null
          restante: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          ciclo_academico_id?: string | null
          created_at?: string | null
          estudiante_id?: string | null
          id?: string
          nivel: string
          nombre: string
          pagado?: number | null
          restante?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          ciclo_academico_id?: string | null
          created_at?: string | null
          estudiante_id?: string | null
          id?: string
          nivel?: string
          nombre?: string
          pagado?: number | null
          restante?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planes_pago_ciclo_academico_id_fkey"
            columns: ["ciclo_academico_id"]
            isOneToOne: false
            referencedRelation: "ciclos_academicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planes_pago_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
        ]
      }
      profesores: {
        Row: {
          apellidos: string
          created_at: string
          direccion: string | null
          dni: string
          edad: number | null
          email: string | null
          especialidad: string | null
          estado: string | null
          fecha_contratacion: string | null
          fecha_nacimiento: string | null
          id: string
          nombres: string
          sede_id: string
          sexo: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          created_at?: string
          direccion?: string | null
          dni: string
          edad?: number | null
          email?: string | null
          especialidad?: string | null
          estado?: string | null
          fecha_contratacion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombres: string
          sede_id: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          created_at?: string
          direccion?: string | null
          dni?: string
          edad?: number | null
          email?: string | null
          especialidad?: string | null
          estado?: string | null
          fecha_contratacion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombres?: string
          sede_id?: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          estudiante_id: string | null
          id: string
          profesor_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estudiante_id?: string | null
          id?: string
          profesor_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estudiante_id?: string | null
          id?: string
          profesor_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profesores"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_cursos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          curso_id: string
          id: string
          salon_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          curso_id: string
          id?: string
          salon_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          curso_id?: string
          id?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_cursos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_cursos_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salones"
            referencedColumns: ["id"]
          },
        ]
      }
      salones: {
        Row: {
          activo: boolean | null
          capacidad: number | null
          ciclo_academico_id: string | null
          codigo: string
          created_at: string | null
          grado: string
          id: string
          nivel: string
          nombre: string | null
          profesor_id: string | null
          seccion: string
          sede_id: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          capacidad?: number | null
          ciclo_academico_id?: string | null
          codigo: string
          created_at?: string | null
          grado: string
          id?: string
          nivel: string
          nombre?: string | null
          profesor_id?: string | null
          seccion: string
          sede_id: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          capacidad?: number | null
          ciclo_academico_id?: string | null
          codigo?: string
          created_at?: string | null
          grado?: string
          id?: string
          nivel?: string
          nombre?: string | null
          profesor_id?: string | null
          seccion?: string
          sede_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salones_ciclo_academico_id_fkey"
            columns: ["ciclo_academico_id"]
            isOneToOne: false
            referencedRelation: "ciclos_academicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salones_profesor_id_fkey"
            columns: ["profesor_id"]
            isOneToOne: false
            referencedRelation: "profesores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          activo: boolean | null
          ciudad: string
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          ciudad: string
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          ciudad?: string
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventas_inventario: {
        Row: {
          cantidad: number
          created_at: string | null
          estudiante_id: string
          fecha_venta: string | null
          id: string
          inventario_id: string
          precio_total: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          estudiante_id: string
          fecha_venta?: string | null
          id?: string
          inventario_id: string
          precio_total: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          estudiante_id?: string
          fecha_venta?: string | null
          id?: string
          inventario_id?: string
          precio_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_inventario_estudiante_id_fkey"
            columns: ["estudiante_id"]
            isOneToOne: false
            referencedRelation: "estudiantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_inventario_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      asignar_profesor_a_curso: {
        Args: { p_curso_id: string; p_profesor_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      matricular_con_validacion: {
        Args: {
          p_curso_id: string
          p_estudiante_id: string
          p_periodo_academico: string
          p_sede_id: string
        }
        Returns: Json
      }
      obtener_estadisticas_curso: {
        Args: { p_curso_id: string }
        Returns: Json
      }
      procesar_pago: {
        Args: {
          p_concepto: string
          p_estudiante_id: string
          p_metodo_pago: string
          p_monto: number
          p_sede_id: string
        }
        Returns: Json
      }
      registrar_estudiante_y_matricula: {
        Args: {
          p_apellidos: string
          p_curso_id: string
          p_dni: string
          p_email: string
          p_nombres: string
          p_periodo_academico: string
          p_sede_id: string
        }
        Returns: Json
      }
      registrar_evaluacion_y_actualizar_promedio: {
        Args: {
          p_fecha_evaluacion: string
          p_matricula_id: string
          p_nota: number
          p_peso: number
          p_tipo_evaluacion: string
        }
        Returns: Json
      }
      revertir_pago: { Args: { p_pago_id: string }; Returns: Json }
      vender_material_inventario: {
        Args: {
          p_cantidad: number
          p_estudiante_id: string
          p_inventario_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
