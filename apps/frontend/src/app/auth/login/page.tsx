/**
 * Login Page - Server Component
 * Handles authentication flow with proper server/client separation
 */

import type { Metadata } from '@/types/next.d'
import { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { LoginFormRefactored } from '@/components/auth/login-form'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export const metadata: Metadata = {
  title: 'Sign In | TenantFlow',
  description: 'Sign in to your TenantFlow account to access your property management dashboard.',
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
      title="Sign In"
      subtitle="Welcome back to TenantFlow"
      description="Enter your credentials to access your dashboard"
      side="left"
      image={{
        src: "/images/roi-up_to_the_right.jpg",
        alt: "Modern property management dashboard"
      }}
      heroContent={{
        title: "Streamline Your Property Management",
        description: "Join thousands of property owners who save hours every week with our powerful, intuitive platform."
      }}
    >
      <Suspense fallback={
        <div className="h-[400px] animate-pulse bg-muted rounded-lg" />
      }>
        <LoginFormRefactored 
          redirectTo={redirectTo}
          error={params?.error}
        />
      </Suspense>
    </AuthLayout>
  )
}