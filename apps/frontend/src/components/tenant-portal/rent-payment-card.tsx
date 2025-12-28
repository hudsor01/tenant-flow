'use client'

import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Button } from '#components/ui/button'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'
import type { RentStatus } from './tenant-stats-cards'

interface RentPaymentCardProps {
	amount: number
	dueDate: string
	status: RentStatus
	onPayRent?: (() => void) | undefined
}

export function RentPaymentCard({
	amount,
	dueDate,
	status,
	onPayRent
}: RentPaymentCardProps) {
	const isPaid = status === 'paid'

	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg p-6 mb-6 relative overflow-hidden">
				{!isPaid && (
					<BorderBeam
						size={120}
						duration={10}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary) / 0.3)"
					/>
				)}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
							<CreditCard className="w-6 h-6 text-primary" aria-hidden="true" />
						</div>
						<div>
							<h3 className="font-semibold text-foreground">Rent Payment</h3>
							<p className="text-sm text-muted-foreground">
								{isPaid
									? 'Your rent is paid for this month'
									: `${formatCurrency(amount / 100)} due ${formatDate(dueDate)}`}
							</p>
						</div>
					</div>
					{!isPaid && (
						<Button asChild size="lg" className="gap-2">
							<Link
								href="/tenant/payments/new"
								{...(onPayRent ? { onClick: onPayRent } : {})}
							>
								<CreditCard className="w-5 h-5" aria-hidden="true" />
								Pay Now
							</Link>
						</Button>
					)}
				</div>
			</div>
		</BlurFade>
	)
}
