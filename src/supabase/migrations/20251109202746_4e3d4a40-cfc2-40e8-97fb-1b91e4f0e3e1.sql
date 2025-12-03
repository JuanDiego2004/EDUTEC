-- Crear tabla salones
CREATE TABLE public.salones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text,
  nivel text NOT NULL CHECK (nivel IN ('INICIAL', 'PRIMARIA')),
  grado text NOT NULL,
  seccion text NOT NULL,
  sede_id uuid NOT NULL REFERENCES public.sedes(id),
  profesor_id uuid REFERENCES public.profesores(id),
  capacidad integer DEFAULT 30,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla para la relación estudiantes-salones
CREATE TABLE public.estudiantes_salones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salones(id) ON DELETE CASCADE,
  periodo_academico text NOT NULL,
  fecha_asignacion timestamp with time zone DEFAULT now(),
  activo boolean DEFAULT true,
  UNIQUE(estudiante_id, salon_id, periodo_academico)
);

-- Enable RLS
ALTER TABLE public.salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes_salones ENABLE ROW LEVEL SECURITY;

-- RLS Policies para salones
CREATE POLICY "Admins can manage salones"
ON public.salones
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos pueden ver salones"
ON public.salones
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies para estudiantes_salones
CREATE POLICY "Admins can manage estudiantes_salones"
ON public.estudiantes_salones
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos pueden ver estudiantes_salones"
ON public.estudiantes_salones
FOR SELECT
TO authenticated
USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_salones_updated_at
BEFORE UPDATE ON public.salones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();