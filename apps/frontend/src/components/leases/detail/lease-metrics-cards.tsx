'use client'

import { Card, CardContent } from '#components/ui/card'
import { DollarSign, CreditCard, CalendarDays, Clock } from 'lucide-react'
import { formatCurrency, getOrdinalSuffix } from './lease-detail-utils'

interface LeaseMetricsCardsProps {
	rentAmount: number | null
	securityDeposit: number | null
	paymentDay: number | null
	gracePeriodDays: number | null
}

export function LeaseMetricsCards({
	rentAmount,
	securityDeposit,
	paymentDay,
	gracePeriodDays
}: LeaseMetricsCardsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
						<DollarSign className="w-4 h-4" />
						Monthly Rent
					</div>
					<p className="text-xl font-semibold tabular-nums">
						{formatCurrency(rentAmount)}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
						<CreditCard className="w-4 h-4" />
						Security Deposit
					</div>
					<p className="text-xl font-semibold tabular-nums">
						{formatCurrency(securityDeposit)}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
						<CalendarDays className="w-4 h-4" />
						Payment Day
					</div>
					<p className="text-xl font-semibold">
						{paymentDay
							? `${paymentDay}${getOrdinalSuffix(paymentDay)} of month`
							: 'N/A'}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
						<Clock className="w-4 h-4" />
						Grace Period
					</div>
					<p className="text-xl font-semibold">
						{gracePeriodDays ? `${gracePeriodDays} days` : 'None'}
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
