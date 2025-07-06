import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
}

/**
 * Protected route component using official Supabase auth patterns
 * Automatically redirects unauthenticated users to login
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) {
  const { session, user, isLoading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!session || !user) {
    logger.info('Redirecting unauthenticated user to login', { 
      pathname: location.pathname 
    })
    
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location.pathname }}
        replace 
      />
    )
  }

  // Check role-based access if required
  if (requiredRole && user.role !== requiredRole) {
    logger.warn('User lacks required role for route', { 
      userRole: user.role, 
      requiredRole, 
      pathname: location.pathname 
    })
    
    // Redirect based on user's actual role
    const redirectPath = user.role === 'TENANT' ? '/tenant/dashboard' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}