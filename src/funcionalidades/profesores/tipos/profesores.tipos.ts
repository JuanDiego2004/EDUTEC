export interface Salon {
    id: string;
    codigo: string;
    nombre: string;
    nivel: string;
    grado: string;
    seccion: string;
    capacidad: number;
    estudiantes_count?: number;
}

export interface Estudiante {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
}

export interface Asistencia {
    estudiante_id: string;
    estado: string;
}

export interface SalonCurso {
    id: string;
    cursos: {
        id: string;
        codigo: string;
        nombre: string;
    };
}

export interface Competencia {
    id: string;
    nombre: string;
    descripcion: string;
    porcentaje: number;
}
