import type { Metadata } from 'next'
import { LoginLayout } from '@/components/auth/login-layout'

export const metadata: Metadata = {
  title: 'Sign Up - TenantFlow',
  description: 'Join forward-thinking property managers using TenantFlow. Start your free trial today - no credit card required.',
  keywords: ['property management', 'tenant management', 'real estate', 'signup', 'free trial'],
  openGraph: {
    title: 'Sign Up for TenantFlow - Property Management Platform',
    description: 'Transform your property management with TenantFlow. 30-day free trial, no credit card required.',
    type: 'website'
  }
}

export default function SignupPage() {
  return (
    <LoginLayout
      mode="signup"
      title="Create Your Account"
      subtitle="Start managing properties more efficiently in minutes"
      imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      content={{
        heading: "Start Your Free Trial",
        description: "Reduce time spent on paperwork by 75% and increase tenant satisfaction. See why property managers are switching to TenantFlow.",
        stats: [
          { value: "75%", label: "Less\nPaperwork" },
          { value: "30-Day", label: "Free\nTrial" },
          { value: "No CC", label: "Required" }
        ]
      }}
    />
  )
}