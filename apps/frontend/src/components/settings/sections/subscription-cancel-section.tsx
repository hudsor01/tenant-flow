'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { toast } from 'sonner'

export function SubscriptionCancelSection() {
	const createPortalSession = useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			const { data: sessionData } = await supabase.auth.getSession()
			const token = sessionData.session?.access_token
			if (!token) throw new Error('Not authenticated')
			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(`${baseUrl}/functions/v1/stripe-billing-portal`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
			if (!response.ok) {
				const err = await response.json().catch(() => ({ error: response.statusText }))
				throw new Error((err as { error?: string }).error ?? 'Failed to open billing portal')
			}
			return response.json() as Promise<{ url: string }>
		},
		onSuccess: data => {
			window.location.href = data.url
		},
		onError: error => {
			const message =
				error instanceof Error && error.message.includes('No Stripe customer')
					? 'Your billing account is not set up yet. Please contact support.'
					: 'Failed to open billing portal. Please try again.'
			toast.error(message)
		}
	})

	return (
		<BlurFade delay={0.55} inView>
			<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
				<h3 className="mb-4 text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
					<AlertTriangle className="h-4 w-4" />
					Danger Zone
				</h3>

				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium">Cancel Subscription</p>
						<p className="text-xs text-muted-foreground">
							Your data will be retained for 30 days after cancellation
						</p>
					</div>
					<button
						className="px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
						onClick={() => createPortalSession.mutate()}
						disabled={createPortalSession.isPending}
					>
						{createPortalSession.isPending ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading...
							</span>
						) : (
							'Cancel Plan'
						)}
					</button>
				</div>
			</section>
		</BlurFade>
	)
}
