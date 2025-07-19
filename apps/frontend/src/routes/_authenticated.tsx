import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PropertyOwnerLayout } from '@/components/layout/PropertyOwnerLayout'
import { queryClient, supabase } from '@/lib/api'

export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async ({ location }) => {
		// Check Supabase session instead of localStorage tokens
		if (!supabase) {
			throw redirect({
				to: '/auth/login',
				search: {
					redirect: location.href
				}
			})
		}

		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		if (error || !session) {
			throw redirect({
				to: '/auth/login',
				search: {
					redirect: location.href
				}
			})
		}

		return {
			queryClient
		}
	},
	component: AuthenticatedLayoutRoute
})

function AuthenticatedLayoutRoute() {
	return (
		<PropertyOwnerLayout>
			<Outlet />
		</PropertyOwnerLayout>
	)
}
