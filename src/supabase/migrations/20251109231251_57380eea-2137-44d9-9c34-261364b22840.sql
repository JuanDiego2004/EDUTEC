-- Agregar campos a estudiantes
ALTER TABLE estudiantes
ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('MASCULINO', 'FEMENINO')),
ADD COLUMN IF NOT EXISTS edad integer,
ADD COLUMN IF NOT EXISTS apoderado_dni text,
ADD COLUMN IF NOT EXISTS apoderado_nombres text,
ADD COLUMN IF NOT EXISTS apoderado_apellidos text,
ADD COLUMN IF NOT EXISTS apoderado_email text,
ADD COLUMN IF NOT EXISTS apoderado_telefono text,
ADD COLUMN IF NOT EXISTS apoderado_sexo text CHECK (apoderado_sexo IN ('MASCULINO', 'FEMENINO')),
ADD COLUMN IF NOT EXISTS apoderado_edad integer,
ADD COLUMN IF NOT EXISTS apoderado_fecha_nacimiento date,
ADD COLUMN IF NOT EXISTS apoderado_direccion text;

-- Agregar campos a profesores
ALTER TABLE profesores
ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('MASCULINO', 'FEMENINO')),
ADD COLUMN IF NOT EXISTS edad integer,
ADD COLUMN IF NOT EXISTS fecha_nacimiento date;

-- Crear tabla de planes de pago
CREATE TABLE IF NOT EXISTS planes_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ciclo_academico_id uuid REFERENCES ciclos_academicos(id),
  nivel text NOT NULL CHECK (nivel IN ('INICIAL', 'PRIMARIA')),
  estudiante_id uuid REFERENCES estudiantes(id) ON DELETE CASCADE,
  total numeric(10,2) DEFAULT 0,
  pagado numeric(10,2) DEFAULT 0,
  restante numeric(10,2) DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de cuotas
CREATE TABLE IF NOT EXISTS cuotas_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_pago_id uuid REFERENCES planes_pago(id) ON DELETE CASCADE NOT NULL,
  numero_cuota integer NOT NULL,
  concepto text NOT NULL,
  monto numeric(10,2) NOT NULL,
  fecha_vencimiento date NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  fecha_pago timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Agregar relación de plan de pago en matrículas
ALTER TABLE matriculas
ADD COLUMN IF NOT EXISTS plan_pago_id uuid REFERENCES planes_pago(id);

-- RLS para planes_pago
ALTER TABLE planes_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden gestionar planes de pago"
ON planes_pago FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Estudiantes pueden ver sus planes"
ON planes_pago FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.estudiante_id = planes_pago.estudiante_id
  )
);

-- RLS para cuotas_pago
ALTER TABLE cuotas_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden gestionar cuotas"
ON cuotas_pago FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Estudiantes pueden ver sus cuotas"
ON cuotas_pago FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM planes_pago pp
    JOIN profiles p ON pp.estudiante_id = p.estudiante_id
    WHERE pp.id = cuotas_pago.plan_pago_id
    AND p.user_id = auth.uid()
  )
);

-- Trigger para actualizar totales del plan de pago
CREATE OR REPLACE FUNCTION actualizar_totales_plan_pago()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE planes_pago
  SET 
    total = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id),
    pagado = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id AND estado = 'pagado'),
    restante = (SELECT COALESCE(SUM(monto), 0) FROM cuotas_pago WHERE plan_pago_id = NEW.plan_pago_id AND estado != 'pagado'),
    updated_at = now()
  WHERE id = NEW.plan_pago_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_actualizar_totales_plan
AFTER INSERT OR UPDATE OR DELETE ON cuotas_pago
FOR EACH ROW
EXECUTE FUNCTION actualizar_totales_plan_pago();

-- Trigger para actualizar updated_at en planes_pago
CREATE TRIGGER update_planes_pago_updated_at
BEFORE UPDATE ON planes_pago
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en cuotas_pago
CREATE TRIGGER update_cuotas_pago_updated_at
BEFORE UPDATE ON cuotas_pago
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();