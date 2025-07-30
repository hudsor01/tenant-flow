import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PropertyOwnerLayout } from '@/components/layout/PropertyOwnerLayout'
import { queryClient, supabase } from '@/lib/clients'

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

		// Add a small delay to ensure Supabase has processed the session
		await new Promise(resolve => setTimeout(resolve, 100))

		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		console.log('[Auth Guard] Session check:', { 
			hasSession: !!session, 
			error: error?.message,
			user: session?.user?.email 
		})

		if (error || !session) {
			// Check if we're coming from the callback with tokens
			const hash = window.location.hash
			if (hash && hash.includes('access_token')) {
				console.log('[Auth Guard] Found tokens in URL, waiting for session...')
				// Give Supabase more time to process the tokens
				await new Promise(resolve => setTimeout(resolve, 1000))
				
				// Try again
				const retry = await supabase.auth.getSession()
				if (retry.data.session) {
					console.log('[Auth Guard] Session found after retry')
					return { queryClient }
				}
			}

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
