-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Create profiles table to link users to students/teachers
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  estudiante_id UUID REFERENCES estudiantes(id) ON DELETE SET NULL,
  profesor_id UUID REFERENCES profesores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID REFERENCES matriculas(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  justificacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(matricula_id, fecha)
);

-- Enable RLS on attendance
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  aula TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on schedules
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
DO $$ BEGIN
  CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for profiles
DO $$ BEGIN
  CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for attendance
DO $$ BEGIN
  CREATE POLICY "Teachers can view attendance for their courses"
  ON public.asistencias FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN cursos c ON m.curso_id = c.id
      INNER JOIN profiles p ON c.profesor_id = p.profesor_id
      WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Students can view their own attendance"
  ON public.asistencias FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN profiles p ON m.estudiante_id = p.estudiante_id
      WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all attendance"
  ON public.asistencias FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Teachers can insert attendance for their courses"
  ON public.asistencias FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN cursos c ON m.curso_id = c.id
      INNER JOIN profiles p ON c.profesor_id = p.profesor_id
      WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Teachers can update attendance for their courses"
  ON public.asistencias FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN cursos c ON m.curso_id = c.id
      INNER JOIN profiles p ON c.profesor_id = p.profesor_id
      WHERE m.id = asistencias.matricula_id AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all attendance"
  ON public.asistencias FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for schedules
DO $$ BEGIN
  CREATE POLICY "Everyone can view schedules"
  ON public.horarios FOR SELECT
  TO authenticated
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage schedules"
  ON public.horarios FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update existing RLS policies to be role-based
DROP POLICY IF EXISTS "Todos pueden insertar estudiantes" ON estudiantes;
DROP POLICY IF EXISTS "Todos pueden actualizar estudiantes" ON estudiantes;

DO $$ BEGIN
  CREATE POLICY "Admins can manage students"
  ON public.estudiantes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar profesores" ON profesores;
DROP POLICY IF EXISTS "Todos pueden actualizar profesores" ON profesores;

DO $$ BEGIN
  CREATE POLICY "Admins can manage teachers"
  ON public.profesores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar cursos" ON cursos;

DO $$ BEGIN
  CREATE POLICY "Admins can manage courses"
  ON public.cursos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar matrículas" ON matriculas;
DROP POLICY IF EXISTS "Todos pueden actualizar matrículas" ON matriculas;

DO $$ BEGIN
  CREATE POLICY "Admins can manage enrollments"
  ON public.matriculas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar pagos" ON pagos;
DROP POLICY IF EXISTS "Todos pueden actualizar pagos" ON pagos;

DO $$ BEGIN
  CREATE POLICY "Admins can manage payments"
  ON public.pagos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Todos pueden actualizar evaluaciones" ON evaluaciones;

DO $$ BEGIN
  CREATE POLICY "Admins can manage evaluations"
  ON public.evaluaciones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Teachers can manage evaluations for their courses"
  ON public.evaluaciones FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN cursos c ON m.curso_id = c.id
      INNER JOIN profiles p ON c.profesor_id = p.profesor_id
      WHERE m.id = evaluaciones.matricula_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM matriculas m
      INNER JOIN cursos c ON m.curso_id = c.id
      INNER JOIN profiles p ON c.profesor_id = p.profesor_id
      WHERE m.id = evaluaciones.matricula_id AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Todos pueden insertar inventario" ON inventario;
DROP POLICY IF EXISTS "Todos pueden actualizar inventario" ON inventario;

DO $$ BEGIN
  CREATE POLICY "Admins can manage inventory"
  ON public.inventario FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update triggers
DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;