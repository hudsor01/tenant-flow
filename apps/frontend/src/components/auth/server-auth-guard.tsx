import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logger } from '@/lib/logger'

interface ServerAuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * Server-side authentication guard
 * 
 * This component runs on the server and handles auth checks before rendering.
 * It's perfect for protecting entire route segments at the layout level.
 * 
 * @param requireAuth - If true, redirects unauthenticated users to login
 * @param redirectTo - Where to redirect unauthenticated users (default: /auth/login)
 */
export async function ServerAuthGuard({ 
  children, 
  redirectTo = '/auth/login',
  requireAuth = true 
}: ServerAuthGuardProps) {
  
  if (!requireAuth) {
    return <>{children}</>
  }

  try {
    const user = await getCurrentUser()
    
    if (!user) {
      logger.debug('ServerAuthGuard: No authenticated user, redirecting', {
        component: 'ServerAuthGuard',
        redirectTo
      })
      redirect(redirectTo)
    }
    
    logger.debug('ServerAuthGuard: User authenticated, allowing access', {
      component: 'ServerAuthGuard',
      userId: user.id
    })
    
    return <>{children}</>
    
  } catch (error) {
    // Don't log NEXT_REDIRECT as an error - it's expected behavior
    const errorString = String(error);
    if (!errorString.includes('NEXT_REDIRECT')) {
      logger.error('ServerAuthGuard: Auth check failed', error instanceof Error ? error : new Error(errorString), {
        component: 'ServerAuthGuard'
      })
    }
    
    redirect(redirectTo)
  }
}

/**
 * Server-side reverse auth guard
 * 
 * Redirects authenticated users away from auth pages (login, signup)
 * to prevent confusion and improve UX.
 */
export async function ServerReverseAuthGuard({ 
  children, 
  redirectTo = '/dashboard' 
}: Omit<ServerAuthGuardProps, 'requireAuth'>) {
  
  try {
    const user = await getCurrentUser()
    
    if (user) {
      logger.debug('ServerReverseAuthGuard: User already authenticated, redirecting', {
        component: 'ServerReverseAuthGuard',
        userId: user.id,
        redirectTo
      })
      redirect(redirectTo)
    }
    
    return <>{children}</>
    
  } catch (error) {
    // If auth check fails, allow access to auth pages
    logger.debug('ServerReverseAuthGuard: Auth check failed, allowing access to auth page', {
      component: 'ServerReverseAuthGuard',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return <>{children}</>
  }
}