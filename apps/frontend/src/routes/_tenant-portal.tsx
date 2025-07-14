import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { trpc, supabase } from '@/lib/trpcClient'

export const Route = createFileRoute('/_tenant-portal')({
	beforeLoad: async ({ location }) => {
		const { data: { session }, error } = await supabase.auth.getSession()

		if (error || !session) {
			throw redirect({
				to: '/auth/login',
				search: { redirect: location.href },
			})
		}

		// Additional tenant portal specific checks can be added here
		// For example, checking if user has tenant access
	},
	component: () => <Outlet />,
})