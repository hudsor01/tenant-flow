import { redirect } from 'next/navigation'
import { createClient } from '#lib/supabase/server'

/**
 * Admin route-group layout. Second of three defense-in-depth layers
 * (proxy.ts, this layout, DB-level is_admin() in RPCs). Server-side
 * check sourced from the JWT app_metadata claim populated by the
 * custom_access_token_hook — no extra DB round-trip on render.
 *
 * Three cases:
 *   1. No user  -> /login?redirect=/admin/analytics
 *   2. Non-admin user -> /dashboard (redirect-loop safe; distinct path)
 *   3. Admin user -> render children
 */
export default async function AdminLayout({
	children
}: {
	children: React.ReactNode
}) {
	const supabase = await createClient()
	const {
		data: { user }
	} = await supabase.auth.getUser()

	if (!user) {
		redirect('/login?redirect=/admin/analytics')
	}

	const userType = (
		user.app_metadata as { user_type?: string } | undefined
	)?.user_type

	if (userType !== 'ADMIN') {
		redirect('/dashboard')
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-background">
				<div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
					<h1 className="text-xl font-semibold text-foreground">Admin</h1>
				</div>
			</header>
			<main>{children}</main>
		</div>
	)
}
