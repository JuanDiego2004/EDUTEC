-- Eliminar el constraint restrictivo de tipo_evaluacion para permitir nombres de competencias
ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_tipo_evaluacion_check;