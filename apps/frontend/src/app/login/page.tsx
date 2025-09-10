import type { Metadata } from 'next'
import { LoginLayout } from '@/components/auth/login-layout'

export const metadata: Metadata = {
  title: 'Sign In - TenantFlow',
  description: 'Access your TenantFlow property management dashboard. Reduce admin work and boost tenant satisfaction.',
  keywords: ['property management', 'tenant management', 'login', 'dashboard', 'real estate'],
  openGraph: {
    title: 'Sign In to TenantFlow - Property Management Platform',
    description: 'Access your property management dashboard with enterprise-grade security and 99.9% uptime.',
    type: 'website'
  }
}

export default function LoginPage() {
  return (
    <LoginLayout
      mode="login"
      title="Welcome Back"
      subtitle="Sign in to your TenantFlow account to continue managing your properties"
      imageUrl="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
      content={{
        heading: "Professional Property Management Made Simple",
        description: "Cut administrative tasks by 75% and focus on growing your portfolio. Welcome back to efficient property management.",
        stats: [
          { value: "75%", label: "Time\nSaved" },
          { value: "99.9%", label: "Platform\nUptime" },
          { value: "SOC 2", label: "Security\nCompliant" }
        ]
      }}
    />
  )
}
