import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '#lib/supabase/server'

// Auth-walled, admin-only. Block search engines from indexing admin pages.
export const metadata: Metadata = {
	robots: { index: false, follow: false }
}

// Admin route-group layout. Second of three defense-in-depth layers
// (proxy.ts, this layout, DB-level is_admin() in RPCs).
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

	const { data: row } = await supabase
		.from('users')
		.select('is_admin')
		.eq('id', user.id)
		.maybeSingle()

	if (!row?.is_admin) {
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
