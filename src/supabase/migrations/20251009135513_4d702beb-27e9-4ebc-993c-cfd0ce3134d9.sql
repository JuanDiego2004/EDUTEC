-- Creación del schema para EduGlobal S.A.C.
-- Sistema de gestión educativa distribuida

-- Tabla de sedes
CREATE TABLE IF NOT EXISTS public.sedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  dni TEXT UNIQUE NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'retirado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  creditos INTEGER DEFAULT 0,
  nivel TEXT CHECK (nivel IN ('primaria', 'secundaria', 'universitario')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de matrículas
CREATE TABLE IF NOT EXISTS public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  curso_id UUID NOT NULL REFERENCES public.cursos(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  periodo_academico TEXT NOT NULL,
  fecha_matricula TIMESTAMPTZ DEFAULT now(),
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'retirada', 'completada')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estudiante_id, curso_id, periodo_academico)
);

-- Tabla de deudas de estudiantes
CREATE TABLE IF NOT EXISTS public.deudas_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) UNIQUE,
  deuda_total DECIMAL(10,2) DEFAULT 0.00,
  deuda_pendiente DECIMAL(10,2) DEFAULT 0.00,
  ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  concepto TEXT NOT NULL,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
  estado TEXT DEFAULT 'completado' CHECK (estado IN ('pendiente', 'completado', 'fallido', 'revertido')),
  fecha_pago TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS public.inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id),
  tipo_material TEXT NOT NULL CHECK (tipo_material IN ('libro', 'uniforme', 'laboratorio', 'otro')),
  codigo_material TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  precio_unitario DECIMAL(10,2) DEFAULT 0.00,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sede_id, codigo_material)
);

-- Tabla de ventas de inventario
CREATE TABLE IF NOT EXISTS public.ventas_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id),
  inventario_id UUID NOT NULL REFERENCES public.inventario(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_total DECIMAL(10,2) NOT NULL,
  fecha_venta TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de evaluaciones
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id),
  tipo_evaluacion TEXT CHECK (tipo_evaluacion IN ('parcial', 'final', 'practica', 'trabajo')),
  nota DECIMAL(5,2) CHECK (nota >= 0 AND nota <= 20),
  peso DECIMAL(3,2) DEFAULT 1.00 CHECK (peso > 0 AND peso <= 1),
  fecha_evaluacion DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de estado académico (promedio por matrícula)
CREATE TABLE IF NOT EXISTS public.estado_academico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) UNIQUE,
  promedio DECIMAL(5,2) DEFAULT 0.00,
  estado TEXT DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'aprobado', 'reprobado')),
  ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deudas_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estado_academico ENABLE ROW LEVEL SECURITY;

-- RLS Policies (público para demostración, ajustar según requerimientos de seguridad)
CREATE POLICY "Todos pueden ver sedes" ON public.sedes FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver estudiantes" ON public.estudiantes FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar estudiantes" ON public.estudiantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar estudiantes" ON public.estudiantes FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver cursos" ON public.cursos FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar cursos" ON public.cursos FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos pueden ver matrículas" ON public.matriculas FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar matrículas" ON public.matriculas FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar matrículas" ON public.matriculas FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver deudas" ON public.deudas_estudiantes FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar deudas" ON public.deudas_estudiantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar deudas" ON public.deudas_estudiantes FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver pagos" ON public.pagos FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar pagos" ON public.pagos FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar pagos" ON public.pagos FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver inventario" ON public.inventario FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar inventario" ON public.inventario FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar inventario" ON public.inventario FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver ventas" ON public.ventas_inventario FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar ventas" ON public.ventas_inventario FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos pueden ver evaluaciones" ON public.evaluaciones FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar evaluaciones" ON public.evaluaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar evaluaciones" ON public.evaluaciones FOR UPDATE USING (true);

CREATE POLICY "Todos pueden ver estado académico" ON public.estado_academico FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar estado académico" ON public.estado_academico FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar estado académico" ON public.estado_academico FOR UPDATE USING (true);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_estudiantes_updated_at BEFORE UPDATE ON public.estudiantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventario_updated_at BEFORE UPDATE ON public.inventario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluaciones_updated_at BEFORE UPDATE ON public.evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FUNCIÓN 1: Registrar estudiante y matrícula en transacción
CREATE OR REPLACE FUNCTION public.registrar_estudiante_y_matricula(
  p_sede_id UUID,
  p_dni TEXT,
  p_nombres TEXT,
  p_apellidos TEXT,
  p_email TEXT,
  p_curso_id UUID,
  p_periodo_academico TEXT
)
RETURNS JSON AS $$
DECLARE
  v_estudiante_id UUID;
  v_matricula_id UUID;
  v_result JSON;
BEGIN
  -- Insertar estudiante
  INSERT INTO public.estudiantes (sede_id, dni, nombres, apellidos, email)
  VALUES (p_sede_id, p_dni, p_nombres, p_apellidos, p_email)
  RETURNING id INTO v_estudiante_id;
  
  -- Crear registro de deuda inicial
  INSERT INTO public.deudas_estudiantes (estudiante_id, deuda_total, deuda_pendiente)
  VALUES (v_estudiante_id, 0, 0);
  
  -- Insertar matrícula
  INSERT INTO public.matriculas (estudiante_id, curso_id, sede_id, periodo_academico)
  VALUES (v_estudiante_id, p_curso_id, p_sede_id, p_periodo_academico)
  RETURNING id INTO v_matricula_id;
  
  -- Crear estado académico inicial
  INSERT INTO public.estado_academico (matricula_id, promedio, estado)
  VALUES (v_matricula_id, 0, 'en_curso');
  
  v_result := json_build_object(
    'success', true,
    'estudiante_id', v_estudiante_id,
    'matricula_id', v_matricula_id,
    'message', 'Estudiante y matrícula registrados exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al registrar estudiante y matrícula'
    );
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 2: Procesar pago y actualizar deuda
CREATE OR REPLACE FUNCTION public.procesar_pago(
  p_estudiante_id UUID,
  p_sede_id UUID,
  p_monto DECIMAL,
  p_concepto TEXT,
  p_metodo_pago TEXT
)
RETURNS JSON AS $$
DECLARE
  v_pago_id UUID;
  v_deuda_actual DECIMAL;
  v_result JSON;
BEGIN
  -- Verificar que el estudiante existe
  IF NOT EXISTS (SELECT 1 FROM public.estudiantes WHERE id = p_estudiante_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Estudiante no encontrado'
    );
  END IF;
  
  -- Registrar el pago
  INSERT INTO public.pagos (estudiante_id, sede_id, monto, concepto, metodo_pago, estado)
  VALUES (p_estudiante_id, p_sede_id, p_monto, p_concepto, p_metodo_pago, 'completado')
  RETURNING id INTO v_pago_id;
  
  -- Actualizar deuda del estudiante
  UPDATE public.deudas_estudiantes
  SET deuda_pendiente = GREATEST(deuda_pendiente - p_monto, 0),
      ultima_actualizacion = now()
  WHERE estudiante_id = p_estudiante_id
  RETURNING deuda_pendiente INTO v_deuda_actual;
  
  v_result := json_build_object(
    'success', true,
    'pago_id', v_pago_id,
    'deuda_restante', v_deuda_actual,
    'message', 'Pago procesado exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar el pago'
    );
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 3: Revertir pago fallido
CREATE OR REPLACE FUNCTION public.revertir_pago(p_pago_id UUID)
RETURNS JSON AS $$
DECLARE
  v_pago_record RECORD;
  v_result JSON;
BEGIN
  -- Obtener información del pago
  SELECT * INTO v_pago_record FROM public.pagos WHERE id = p_pago_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Pago no encontrado'
    );
  END IF;
  
  -- Marcar pago como revertido
  UPDATE public.pagos
  SET estado = 'revertido'
  WHERE id = p_pago_id;
  
  -- Restaurar deuda
  UPDATE public.deudas_estudiantes
  SET deuda_pendiente = deuda_pendiente + v_pago_record.monto,
      ultima_actualizacion = now()
  WHERE estudiante_id = v_pago_record.estudiante_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Pago revertido exitosamente',
    'monto_revertido', v_pago_record.monto
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al revertir el pago'
    );
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 4: Venta de inventario con bloqueo (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.vender_material_inventario(
  p_estudiante_id UUID,
  p_inventario_id UUID,
  p_cantidad INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_inventario RECORD;
  v_venta_id UUID;
  v_precio_total DECIMAL;
  v_result JSON;
BEGIN
  -- Bloquear el registro de inventario para evitar ventas concurrentes
  SELECT * INTO v_inventario
  FROM public.inventario
  WHERE id = p_inventario_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Material no encontrado en inventario'
    );
  END IF;
  
  -- Verificar stock disponible
  IF v_inventario.stock < p_cantidad THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Stock insuficiente',
      'stock_disponible', v_inventario.stock
    );
  END IF;
  
  -- Calcular precio total
  v_precio_total := v_inventario.precio_unitario * p_cantidad;
  
  -- Registrar la venta
  INSERT INTO public.ventas_inventario (estudiante_id, inventario_id, cantidad, precio_total)
  VALUES (p_estudiante_id, p_inventario_id, p_cantidad, v_precio_total)
  RETURNING id INTO v_venta_id;
  
  -- Actualizar stock
  UPDATE public.inventario
  SET stock = stock - p_cantidad,
      updated_at = now()
  WHERE id = p_inventario_id;
  
  v_result := json_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'precio_total', v_precio_total,
    'stock_restante', v_inventario.stock - p_cantidad,
    'message', 'Venta registrada exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar la venta'
    );
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 5: Registrar evaluación y actualizar promedio
CREATE OR REPLACE FUNCTION public.registrar_evaluacion_y_actualizar_promedio(
  p_matricula_id UUID,
  p_tipo_evaluacion TEXT,
  p_nota DECIMAL,
  p_peso DECIMAL,
  p_fecha_evaluacion DATE
)
RETURNS JSON AS $$
DECLARE
  v_evaluacion_id UUID;
  v_nuevo_promedio DECIMAL;
  v_result JSON;
BEGIN
  -- Insertar evaluación
  INSERT INTO public.evaluaciones (matricula_id, tipo_evaluacion, nota, peso, fecha_evaluacion)
  VALUES (p_matricula_id, p_tipo_evaluacion, p_nota, p_peso, p_fecha_evaluacion)
  RETURNING id INTO v_evaluacion_id;
  
  -- Calcular nuevo promedio ponderado
  SELECT COALESCE(SUM(nota * peso) / NULLIF(SUM(peso), 0), 0)
  INTO v_nuevo_promedio
  FROM public.evaluaciones
  WHERE matricula_id = p_matricula_id;
  
  -- Actualizar estado académico
  UPDATE public.estado_academico
  SET promedio = v_nuevo_promedio,
      estado = CASE
        WHEN v_nuevo_promedio >= 10.5 THEN 'aprobado'
        ELSE 'reprobado'
      END,
      ultima_actualizacion = now()
  WHERE matricula_id = p_matricula_id;
  
  v_result := json_build_object(
    'success', true,
    'evaluacion_id', v_evaluacion_id,
    'nuevo_promedio', v_nuevo_promedio,
    'message', 'Evaluación registrada y promedio actualizado'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al registrar evaluación'
    );
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN 6: Prevenir matrícula duplicada en diferentes sedes
CREATE OR REPLACE FUNCTION public.matricular_con_validacion(
  p_estudiante_id UUID,
  p_curso_id UUID,
  p_sede_id UUID,
  p_periodo_academico TEXT
)
RETURNS JSON AS $$
DECLARE
  v_matricula_id UUID;
  v_matricula_existente INTEGER;
  v_result JSON;
BEGIN
  -- Verificar si ya está matriculado en el mismo curso y periodo
  SELECT COUNT(*) INTO v_matricula_existente
  FROM public.matriculas
  WHERE estudiante_id = p_estudiante_id
    AND curso_id = p_curso_id
    AND periodo_academico = p_periodo_academico
    AND estado = 'activa';
  
  IF v_matricula_existente > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'El estudiante ya está matriculado en este curso para el periodo académico actual'
    );
  END IF;
  
  -- Registrar la matrícula
  INSERT INTO public.matriculas (estudiante_id, curso_id, sede_id, periodo_academico)
  VALUES (p_estudiante_id, p_curso_id, p_sede_id, p_periodo_academico)
  RETURNING id INTO v_matricula_id;
  
  -- Crear estado académico inicial
  INSERT INTO public.estado_academico (matricula_id, promedio, estado)
  VALUES (v_matricula_id, 0, 'en_curso')
  ON CONFLICT (matricula_id) DO NOTHING;
  
  v_result := json_build_object(
    'success', true,
    'matricula_id', v_matricula_id,
    'message', 'Matrícula registrada exitosamente'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Error al procesar la matrícula'
    );
END;
$$ LANGUAGE plpgsql;

-- Insertar datos de ejemplo para las 4 sedes
INSERT INTO public.sedes (nombre, ciudad, direccion) VALUES
  ('Sede Central Lima', 'Lima', 'Av. Arequipa 1234'),
  ('Sede Cusco', 'Cusco', 'Av. El Sol 567'),
  ('Sede Arequipa', 'Arequipa', 'Calle Mercaderes 890'),
  ('Sede Piura', 'Piura', 'Av. Grau 345')
ON CONFLICT DO NOTHING;