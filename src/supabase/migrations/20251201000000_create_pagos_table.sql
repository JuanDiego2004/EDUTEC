-- Agregar campo cuota_id a la tabla pagos existente para vincular pagos con cuotas
ALTER TABLE public.pagos
ADD COLUMN IF NOT EXISTS cuota_id UUID REFERENCES public.cuotas_pago(id) ON DELETE SET NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_cuota_id ON public.pagos(cuota_id);

-- Comentario para documentación
COMMENT ON COLUMN public.pagos.cuota_id IS 'Referencia opcional a la cuota específica que fue pagada. NULL para pagos generales no asociados a una cuota.';
