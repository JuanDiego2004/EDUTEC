-- Tabla para relacionar salones con cursos
CREATE TABLE public.salon_cursos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salones(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(salon_id, curso_id)
);

-- Tabla para competencias académicas por curso en un salón
CREATE TABLE public.competencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_curso_id UUID NOT NULL REFERENCES public.salon_cursos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_salon_cursos_salon_id ON public.salon_cursos(salon_id);
CREATE INDEX idx_salon_cursos_curso_id ON public.salon_cursos(curso_id);
CREATE INDEX idx_competencias_salon_curso_id ON public.competencias(salon_curso_id);

-- Habilitar RLS
ALTER TABLE public.salon_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para salon_cursos
CREATE POLICY "Admins can manage salon_cursos"
ON public.salon_cursos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their salon courses"
ON public.salon_cursos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.salones s
    INNER JOIN public.profiles p ON s.profesor_id = p.profesor_id
    WHERE s.id = salon_cursos.salon_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Everyone can view salon courses"
ON public.salon_cursos
FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para competencias
CREATE POLICY "Admins can manage competencias"
ON public.competencias
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view competencias for their salons"
ON public.competencias
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.salon_cursos sc
    INNER JOIN public.salones s ON sc.salon_id = s.id
    INNER JOIN public.profiles p ON s.profesor_id = p.profesor_id
    WHERE sc.id = competencias.salon_curso_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Everyone can view competencias"
ON public.competencias
FOR SELECT
TO authenticated
USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_competencias_updated_at
BEFORE UPDATE ON public.competencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();