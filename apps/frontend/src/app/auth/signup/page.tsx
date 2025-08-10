import type { Metadata } from '@/types/next.d'
import { Suspense } from 'react'
import { SignupFormRefactored } from '@/components/auth/signup-form'
import { AuthLayout } from '@/components/auth/auth-layout'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export const metadata: Metadata = {
  title: 'Sign Up | TenantFlow',
  description: 'Create your TenantFlow account and start managing properties efficiently.',
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  // Await searchParams as required in Next.js 15
  const params = await searchParams
  
  // Check if user is already authenticated
  const user = await getCurrentUser()
  
  if (user) {
    return <AuthRedirect to={params?.redirect || '/dashboard'} />
  }

  const redirectTo = params?.redirect || '/dashboard'

  return (
    <AuthLayout 
      title="Get Started"
      subtitle="Join TenantFlow today"
      description="Create your account and start managing properties effortlessly"
      side="right"
      image={{
        src: '/property-management-og.jpg',
        alt: 'Property management platform'
      }}
      heroContent={{
        title: 'Start Your 14-Day Free Trial',
        description: 'No credit card required. Get instant access to all features and see how TenantFlow can transform your property management.'
      }}
    >
      <Suspense fallback={
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      }>
        <SignupFormRefactored 
          redirectTo={redirectTo}
          error={params?.error}
        />
      </Suspense>
    </AuthLayout>
  )
}