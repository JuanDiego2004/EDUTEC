-- Crear tabla de ciclos académicos
CREATE TABLE IF NOT EXISTS public.ciclos_academicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fecha_fin_posterior CHECK (fecha_fin > fecha_inicio)
);

-- Habilitar RLS
ALTER TABLE public.ciclos_academicos ENABLE ROW LEVEL SECURITY;

-- Políticas para ciclos académicos
CREATE POLICY "Todos pueden ver ciclos académicos"
ON public.ciclos_academicos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins pueden gestionar ciclos académicos"
ON public.ciclos_academicos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Añadir ciclo_academico_id a salones
ALTER TABLE public.salones
ADD COLUMN IF NOT EXISTS ciclo_academico_id UUID REFERENCES public.ciclos_academicos(id) ON DELETE SET NULL;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_ciclos_academicos_updated_at
BEFORE UPDATE ON public.ciclos_academicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();