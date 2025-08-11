import type { Metadata } from '@/types/next.d'
import { Suspense } from 'react'
import { ForgotPasswordFormRefactored } from '@/components/auth/forgot-password-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ClientAuthGuard } from '@/components/auth/client-auth-guard'

export const metadata: Metadata = {
  title: 'Reset Password | TenantFlow',
  description: 'Reset your TenantFlow account password. We\'ll send you secure reset instructions.',
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <ClientAuthGuard>
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
          <ForgotPasswordFormRefactored error={searchParams?.error} />
        </Suspense>
      </AuthLayout>
    </ClientAuthGuard>
  )
}