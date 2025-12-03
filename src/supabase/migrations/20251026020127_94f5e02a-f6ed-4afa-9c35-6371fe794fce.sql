-- Crear tabla de grados y secciones
CREATE TABLE public.grados_secciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grado TEXT NOT NULL CHECK (grado IN ('1°', '2°', '3°', '4°', '5°', '6°')),
  seccion TEXT NOT NULL CHECK (seccion ~ '^[A-Z]$'),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(grado, seccion, sede_id)
);

-- Habilitar RLS
ALTER TABLE public.grados_secciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos pueden ver grados_secciones"
ON public.grados_secciones
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage grados_secciones"
ON public.grados_secciones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Agregar relación a matriculas
ALTER TABLE public.matriculas
ADD COLUMN grado_seccion_id UUID REFERENCES public.grados_secciones(id);

-- Agregar relación a cursos
ALTER TABLE public.cursos
ADD COLUMN grado_seccion_id UUID REFERENCES public.grados_secciones(id);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_matriculas_grado_seccion ON public.matriculas(grado_seccion_id);
CREATE INDEX idx_cursos_grado_seccion ON public.cursos(grado_seccion_id);
CREATE INDEX idx_grados_secciones_sede ON public.grados_secciones(sede_id);