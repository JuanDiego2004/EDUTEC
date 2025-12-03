export type Estudiante = {
  id: string;
  sede_id: string;
  dni: string;
  nombres: string;
  apellidos: string;

  email: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  sexo: string | null;
  direccion: string | null;
  telefono: string | null;

  apoderado_dni: string | null;
  apoderado_nombres: string | null;
  apoderado_apellidos: string | null;
  apoderado_email: string | null;
  apoderado_telefono: string | null;
  apoderado_direccion: string | null;
  apoderado_fecha_nacimiento: string | null;
  apoderado_edad: number | null;
  apoderado_sexo: string | null;

  estado: string | null;
  created_at: string | null;
  updated_at: string | null;

  sedes?: {
    nombre: string;
    ciudad: string;
  };
};

export type UserRole = "admin" | "teacher" | "student";


export interface Profesor {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
}


export interface Profile {
  user_id: string;
  profesor_id: string | null;
  estudiante_id: string | null;
}


export interface UserRoleRow {
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface UserData {
  user_id: string;
  email: string;
  role: "admin" | "teacher" | "student";
  profesor_nombre?: string;
  estudiante_nombre?: string;
  created_at: string | null; 
}



export interface EstudianteForm {
  sede_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  sexo: string;
  edad: string; 
  fecha_nacimiento: string | null;

  apoderado_dni: string;
  apoderado_nombres: string;
  apoderado_apellidos: string;
  apoderado_email: string;
  apoderado_telefono: string;
  apoderado_direccion: string;
  apoderado_sexo: string;
  apoderado_edad: string; 
  apoderado_fecha_nacimiento: string | null;
}

export interface FormFieldsProps {
  formData: EstudianteForm;
  setFormData: (data: EstudianteForm) => void;
  sedes: Sede[] | undefined; 
  fechaNacimiento: Date | undefined;
  setFechaNacimiento: (date: Date | undefined) => void;
  fechaNacimientoApoderado: Date | undefined;
  setFechaNacimientoApoderado: (date: Date | undefined) => void;
}

export interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean | null;
  created_at: string | null;
}
