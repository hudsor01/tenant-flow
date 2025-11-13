import { Card, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { formatCents } from '@repo/shared/lib/format'
import type { OwnerPaymentSummaryResponse } from '@repo/shared/types/api-contracts'

interface OwnerPaymentSummaryProps {
	summary: OwnerPaymentSummaryResponse | null
}

export function OwnerPaymentSummary({ summary }: OwnerPaymentSummaryProps) {
	const values = summary ?? {
		lateFeeTotal: 0,
		unpaidTotal: 0,
		unpaidCount: 0,
		tenantCount: 0
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader>
					<CardDescription>Late fees cumulative</CardDescription>
					<CardTitle className="text-2xl font-semibold text-destructive">
						{formatCents(values.lateFeeTotal)}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card>
				<CardHeader>
					<CardDescription>Unpaid invoice total</CardDescription>
					<CardTitle className="text-2xl font-semibold">
						{formatCents(values.unpaidTotal)}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card>
				<CardHeader>
					<CardDescription>Outstanding invoices</CardDescription>
					<CardTitle className="text-2xl font-semibold">
						{values.unpaidCount}
					</CardTitle>
				</CardHeader>
			</Card>
			<Card>
				<CardHeader>
					<CardDescription>Tenants monitored</CardDescription>
					<CardTitle className="text-2xl font-semibold">
						{values.tenantCount}
					</CardTitle>
				</CardHeader>
			</Card>
		</div>
	)
}
