'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { logger } from '@/lib/logger'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteGuardProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
  requireAuth?: boolean
}

/**
 * Client-side protected route guard
 * 
 * This component handles client-side auth protection and provides
 * loading states during auth checks. It's designed to work alongside
 * server-side protection for a seamless user experience.
 */
export function ProtectedRouteGuard({ 
  children, 
  redirectTo = '/auth/login',
  requireAuth = true,
  fallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    </div>
  )
}: ProtectedRouteGuardProps) {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Don't do anything until auth is initialized
    if (!initialized) return
    
    // Don't check auth if protection is disabled
    if (!requireAuth) return
    
    // If not loading and no user, redirect
    if (!loading && !user && !isRedirecting) {
      logger.debug('ProtectedRouteGuard: Redirecting unauthenticated user', {
        component: 'ProtectedRouteGuard',
        redirectTo,
        currentPath: window.location.pathname
      })
      
      setIsRedirecting(true)
      router.push(redirectTo)
    }
  }, [user, loading, initialized, requireAuth, redirectTo, router, isRedirecting])

  // If auth protection is disabled, render children immediately
  if (!requireAuth) {
    return <>{children}</>
  }

  // Show loading state while initializing or during auth check
  if (!initialized || loading) {
    return <>{fallback}</>
  }

  // Show loading state while redirecting
  if (isRedirecting || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  // User is authenticated, render protected content
  return <>{children}</>
}

/**
 * Client-side reverse auth guard
 * 
 * Redirects authenticated users away from auth pages to improve UX
 */
export function ReverseAuthGuard({ 
  children, 
  redirectTo = '/dashboard',
  fallback = (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  )
}: Omit<ProtectedRouteGuardProps, 'requireAuth'>) {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Don't do anything until auth is initialized
    if (!initialized) return
    
    // If not loading and user exists, redirect
    if (!loading && user && !isRedirecting) {
      logger.debug('ReverseAuthGuard: Redirecting authenticated user', {
        component: 'ReverseAuthGuard',
        userId: user.id,
        redirectTo,
        currentPath: window.location.pathname
      })
      
      setIsRedirecting(true)
      router.push(redirectTo)
    }
  }, [user, loading, initialized, redirectTo, router, isRedirecting])

  // Show loading state while initializing or during auth check
  if (!initialized || loading) {
    return <>{fallback}</>
  }

  // Show loading state while redirecting authenticated users
  if (isRedirecting || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  // User is not authenticated, show auth content
  return <>{children}</>
}

/**
 * Simple loading component for auth states
 */
export function AuthLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}