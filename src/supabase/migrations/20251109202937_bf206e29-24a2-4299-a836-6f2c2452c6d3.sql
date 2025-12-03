-- Agregar campo nivel a la tabla grados_secciones
ALTER TABLE public.grados_secciones 
ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'PRIMARIA' CHECK (nivel IN ('INICIAL', 'PRIMARIA'));