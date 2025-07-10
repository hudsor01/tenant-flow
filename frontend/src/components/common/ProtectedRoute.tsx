import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
}

/**
 * Protected route component using JWT token authentication
 * Automatically redirects unauthenticated users to login
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) {
  const { user, isLoading, getToken } = useAuth()
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
  const accessToken = getToken()
  if (!accessToken || !user) {
    logger.info('Redirecting unauthenticated user to login', undefined, { 
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
  // TODO: Add role detection logic when user profile is available
  if (requiredRole) {
    logger.warn('Role-based access control not yet implemented', undefined, { 
      requiredRole, 
      pathname: location.pathname 
    })
    
    // For now, redirect to default dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}