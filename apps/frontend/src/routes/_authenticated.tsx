import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Layout from '@/components/layout/Layout'
import { trpc, supabase, queryClient } from '@/lib/trpcClient'


export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async ({ location }) => {
		// Check Supabase session
		const { data: { session }, error } = await supabase.auth.getSession()

		if (error || !session) {
			throw redirect({
				to: '/auth/login',
				search: {
					redirect: location.href,
				},
			})
		}

		return {
			user: session.user,
			queryClient,
		}
	},
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	return (
		<Layout>
			<Outlet />
		</Layout>
	)
}
