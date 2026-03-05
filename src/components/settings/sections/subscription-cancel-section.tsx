'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useBillingPortalMutation } from '#hooks/api/use-billing-mutations'

export function SubscriptionCancelSection() {
	const createPortalSession = useBillingPortalMutation()

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
