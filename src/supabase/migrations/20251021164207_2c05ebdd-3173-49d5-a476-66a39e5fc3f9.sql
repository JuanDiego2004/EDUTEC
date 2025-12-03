-- Crear tabla de profesores
CREATE TABLE public.profesores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sede_id UUID NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  especialidad TEXT,
  fecha_contratacion DATE,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profesores
CREATE POLICY "Todos pueden ver profesores" 
ON public.profesores 
FOR SELECT 
USING (true);

CREATE POLICY "Todos pueden insertar profesores" 
ON public.profesores 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar profesores" 
ON public.profesores 
FOR UPDATE 
USING (true);

-- Agregar columna profesor_id a la tabla cursos
ALTER TABLE public.cursos 
ADD COLUMN profesor_id UUID REFERENCES public.profesores(id);

-- Trigger para actualizar updated_at en profesores
CREATE TRIGGER update_profesores_updated_at
BEFORE UPDATE ON public.profesores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para asignar profesor a curso
CREATE OR REPLACE FUNCTION public.asignar_profesor_a_curso(
  p_curso_id UUID,
  p_profesor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar que el curso existe
  IF NOT EXISTS (SELECT 1 FROM public.cursos WHERE id = p_curso_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Curso no encontrado'
    );
  END IF;
  
  -- Verificar que el profesor existe
  IF NOT EXISTS (SELECT 1 FROM public.profesores WHERE id = p_profesor_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Profesor no encontrado'
    );
  END IF;
  
  -- Asignar profesor al curso
  UPDATE public.cursos
  SET profesor_id = p_profesor_id
  WHERE id = p_curso_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Profesor asignado exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al asignar profesor'
    );
END;
$$;

-- Función para obtener estadísticas de curso
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_curso(p_curso_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_total_estudiantes INTEGER;
  v_promedio_general DECIMAL;
BEGIN
  -- Contar estudiantes matriculados
  SELECT COUNT(*) INTO v_total_estudiantes
  FROM public.matriculas
  WHERE curso_id = p_curso_id
    AND estado = 'activa';
  
  -- Calcular promedio general del curso
  SELECT AVG(ea.promedio) INTO v_promedio_general
  FROM public.estado_academico ea
  INNER JOIN public.matriculas m ON ea.matricula_id = m.id
  WHERE m.curso_id = p_curso_id
    AND m.estado = 'activa';
  
  v_result := json_build_object(
    'total_estudiantes', v_total_estudiantes,
    'promedio_general', COALESCE(v_promedio_general, 0)
  );
  
  RETURN v_result;
END;
$$;