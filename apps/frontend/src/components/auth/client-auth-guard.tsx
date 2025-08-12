'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { logger } from '@/lib/logger'
import type { AuthUser } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface ClientAuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * Client-side auth guard that checks authentication status
 * and redirects if user is already authenticated
 */
export function ClientAuthGuard({ 
  children, 
  redirectTo = '/dashboard',
  fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}: ClientAuthGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        if (currentUser) {
          router.push(redirectTo)
          return
        }
      } catch (error) {
        // User is not authenticated, continue to show children
        logger.debug('User not authenticated:', { component: 'components_auth_client_auth_guard.tsx', data: error })
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, redirectTo])

  if (isLoading) {
    return <>{fallback}</>
  }

  if (user) {
    // User is authenticated, showing redirect loading state
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // User is not authenticated, show the auth form
  return <>{children}</>
}