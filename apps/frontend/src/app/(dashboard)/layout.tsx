// Dashboard auth gating at the layout level (no middleware, no redirects)
// Force dynamic rendering so authenticated content is never statically generated
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

import { getCurrentUser } from '@/app/actions/auth'
import { LoginForm } from '@/components/forms/supabase-login-form'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = (await getCurrentUser()) as unknown | null

  if (!user) {
    // Render the login form inline, keeping the URL intact
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    )
  }

  return children
}
