'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'TenantOnboarding' })

type Status = 'loading' | 'activating' | 'success' | 'error'

/**
 * Tenant Onboarding Page (Phase 3.1)
 * Called after Supabase Auth email confirmation
 * Activates tenant record and redirects to dashboard
 */
export default function TenantOnboardingPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const activateTenant = async () => {
      try {
        // 1. Create Supabase browser client
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        )

        // 2. Get current auth user (security best practice: use getUser() not getSession())
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser()

        if (authError || !user) {
          logger.error('Auth error during tenant onboarding', { error: authError })
          setErrorMessage('Not authenticated. Please check your invitation email.')
          setStatus('error')
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        setStatus('activating')

        // 3. Call backend activation endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tenants/activate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ authUserId: user.id })
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Activation failed')
        }

        const data = await response.json()

        if (data.success) {
          setStatus('success')
          // Redirect to tenant dashboard after 2 seconds
          setTimeout(() => router.push('/tenant/dashboard'), 2000)
        } else {
          setErrorMessage(data.message || 'Failed to activate tenant')
          setStatus('error')
        }
      } catch (error) {
        logger.error('Tenant activation error', {}, error)
        setErrorMessage(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        )
        setStatus('error')
      }
    }

    activateTenant()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Setting Up Your Account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === 'loading' && 'Verifying your invitation...'}
            {status === 'activating' && 'Activating your account...'}
            {status === 'success' && 'All set! Redirecting to your dashboard...'}
            {status === 'error' && 'Something went wrong'}
          </p>
        </div>

        <div className="flex justify-center py-8">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}
          {status === 'activating' && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          )}
          {status === 'error' && <XCircle className="h-16 w-16 text-destructive" />}
        </div>

        {status === 'success' && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Welcome! Your account has been activated successfully.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Need help? Contact your property manager.</p>
            </div>
          </div>
        )}

        {(status === 'loading' || status === 'activating') && (
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>Please wait while we set up your account...</p>
            <p className="text-xs">This usually takes just a few seconds.</p>
          </div>
        )}
      </div>
    </div>
  )
}
