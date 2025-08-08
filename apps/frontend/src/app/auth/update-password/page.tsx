import type { Metadata } from 'next'
import { Suspense } from 'react'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'
import { AuthLayout } from '@/components/auth/auth-layout'

export const metadata: Metadata = {
  title: 'Update Password | TenantFlow',
  description: 'Create a new secure password for your TenantFlow account.',
}

export default function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <AuthLayout 
      title="Create New Password"
      subtitle="Almost there!"
      description="Set your new password and you'll be ready to go"
      side="left"
      image={{
        src: '/images/roi-up_to_the_right.jpg',
        alt: 'Secure password update'
      }}
      heroContent={{
        title: 'Security First',
        description: 'Your new password will be securely encrypted and stored using industry-standard security practices.'
      }}
    >
      <Suspense fallback={
        <div className="h-[400px] animate-pulse bg-muted rounded-lg" />
      }>
        <UpdatePasswordForm error={searchParams?.error} />
      </Suspense>
    </AuthLayout>
  )
}