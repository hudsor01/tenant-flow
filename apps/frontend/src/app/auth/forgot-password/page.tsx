import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export const metadata: Metadata = {
  title: 'Reset Password | TenantFlow',
  description: 'Reset your TenantFlow account password. We\'ll send you secure reset instructions.',
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  // Check if user is already authenticated
  const user = await getCurrentUser()
  
  if (user) {
    return <AuthRedirect to="/dashboard" />
  }

  return (
    <AuthLayout 
      title="Reset Password"
      subtitle="Forgot your password?"
      description="No worries, we'll send you reset instructions"
      side="left"
      image={{
        src: '/tenant-screening-og.jpg',
        alt: 'Secure password reset'
      }}
      heroContent={{
        title: 'Secure Password Recovery',
        description: 'Your account security is our priority. We\'ll help you regain access quickly and safely.'
      }}
    >
      <Suspense fallback={
        <div className="h-[300px] animate-pulse bg-muted rounded-lg" />
      }>
        <ForgotPasswordForm error={searchParams?.error} />
      </Suspense>
    </AuthLayout>
  )
}