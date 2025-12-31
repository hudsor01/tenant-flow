'use client'

import { Building2, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import { useRouter } from 'next/navigation'

interface PaymentSettingsSectionProps {
	stripeConnected: boolean
}

export function PaymentSettingsSection({
	stripeConnected
}: PaymentSettingsSectionProps) {
	const router = useRouter()

	return (
		<BlurFade delay={0.55} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-lg font-semibold">Payment Settings</h3>

				{stripeConnected ? (
					<div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
								<CheckCircle className="h-5 w-5 text-emerald-600" />
							</div>
							<div>
								<p className="text-sm font-medium">Stripe Connected</p>
								<p className="text-xs text-muted-foreground">
									You can receive payments from tenants
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => router.push('/settings/billing')}
						>
							<ExternalLink className="h-3 w-3 mr-2" />
							Manage
						</Button>
					</div>
				) : (
					<div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
								<Building2 className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<p className="text-sm font-medium">Stripe Not Connected</p>
								<p className="text-xs text-muted-foreground">
									Connect your bank account to receive payments
								</p>
							</div>
						</div>
						<Button size="sm" onClick={() => router.push('/settings/billing')}>
							Connect Now
						</Button>
					</div>
				)}
			</section>
		</BlurFade>
	)
}
