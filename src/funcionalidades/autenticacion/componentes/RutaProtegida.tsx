import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/funcionalidades/autenticacion/ganchos/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth');
      } else if (role && !allowedRoles.includes(role)) {
        if (role === 'admin') router.replace('/admin');
        else if (role === 'profesor') router.replace('/profesor');
        else if (role === 'estudiante') router.replace('/estudiante');
      }
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user || (role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
