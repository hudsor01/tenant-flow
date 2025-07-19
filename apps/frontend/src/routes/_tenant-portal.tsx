import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { TenantPortalLayout } from '@/components/layout/TenantPortalLayout'
import { supabase } from '@/lib/api'

export const Route = createFileRoute('/_tenant-portal')({
	beforeLoad: async ({ location }) => {
		// Check Supabase session instead of localStorage tokens
		if (!supabase) {
			throw redirect({
				to: '/auth/login',
				search: { redirect: location.href }
			})
		}

		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		if (error || !session) {
			throw redirect({
				to: '/auth/login',
				search: { redirect: location.href }
			})
		}

		// Additional tenant portal specific checks can be added here
		// For example, checking if user has tenant access
	},
	component: TenantPortalLayoutRoute
})

function TenantPortalLayoutRoute() {
	return (
		<TenantPortalLayout>
			<Outlet />
		</TenantPortalLayout>
	)
}
