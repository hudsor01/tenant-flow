'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useBillingHistory } from '#hooks/api/use-billing'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { toast } from 'sonner'

export function BillingHistorySection() {
	const { data: paymentHistory } = useBillingHistory()

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
		<BlurFade delay={0.35} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Billing History
				</h3>

				{paymentHistory && paymentHistory.length > 0 ? (
					<div className="space-y-2">
						{paymentHistory.slice(0, 5).map(
							(
								invoice: {
									id: string
									created_at: string
									amount: number
									status: string
								},
								idx: number
							) => (
								<BlurFade key={invoice.id} delay={0.4 + idx * 0.05} inView>
									<div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium">
												{invoice.id.slice(0, 12)}
											</span>
											<span className="text-sm text-muted-foreground">
												{new Date(invoice.created_at).toLocaleDateString(
													'en-US',
													{ month: 'short', day: 'numeric', year: 'numeric' }
												)}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium">
												${(invoice.amount / 100).toFixed(2)}
											</span>
											<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
												<CheckCircle className="w-3 h-3" />
												Paid
											</span>
											<button className="text-sm text-primary hover:underline">
												Download
											</button>
										</div>
									</div>
								</BlurFade>
							)
						)}
					</div>
				) : (
					<div className="p-4 text-center">
						<p className="text-sm text-muted-foreground">
							No billing history yet
						</p>
					</div>
				)}

				{paymentHistory && paymentHistory.length > 5 && (
					<div className="mt-4 text-center">
						<button
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => createPortalSession.mutate()}
							disabled={createPortalSession.isPending}
						>
							{createPortalSession.isPending ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading...
								</span>
							) : (
								'View All Invoices'
							)}
						</button>
					</div>
				)}
			</section>
		</BlurFade>
	)
}
