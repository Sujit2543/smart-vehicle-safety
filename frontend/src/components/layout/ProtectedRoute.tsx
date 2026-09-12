import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  redirectTo?: string;
}

export function ProtectedRoute({ children, requireRole, redirectTo }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Determine default redirect based on role requirement
  const defaultRedirect = requireRole === 'ADMIN' || requireRole === 'SUPER_ADMIN'
    ? '/admin/login'
    : '/customer/login';

  const target = redirectTo ?? defaultRedirect;

  if (!isAuthenticated) {
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  if (requireRole) {
    const roleHierarchy: Record<string, number> = { CUSTOMER: 0, ADMIN: 1, SUPER_ADMIN: 2 };
    const userLevel    = roleHierarchy[user?.role ?? ''] ?? -1;
    const requiredLevel = roleHierarchy[requireRole]  ?? 0;

    if (userLevel < requiredLevel) {
      // Admin trying to access customer routes — allow (admin > customer)
      if (requireRole === 'CUSTOMER' && userLevel >= 1) return <>{children}</>;
      // Customer trying to access admin — send to customer login
      if (requireRole === 'ADMIN' && userLevel === 0) {
        return <Navigate to="/admin/login" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
