'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { TenantPaymentRecord } from '@repo/shared/types/api-contracts'
import { useTenantPaymentsHistory } from '#hooks/api/use-tenant-payments'
import { formatCents } from '@repo/shared/lib/format'

export default function TenantPaymentsPage() {
	const paymentsQuery = useTenantPaymentsHistory({ limit: 20 })

	return (
		<main className="flex-1 space-y-6 px-6 py-8">
			<Card>
				<CardHeader>
					<CardTitle>Payment history</CardTitle>
				</CardHeader>
				<CardContent>
					{paymentsQuery.isLoading ? (
						<Skeleton className="h-32" />
					) : (
						<div className="divide-y">
						{paymentsQuery.data?.payments.length ? (
							paymentsQuery.data.payments.map((payment: TenantPaymentRecord) => (
									<div key={payment.id} className="flex items-center justify-between py-3">
										<div>
											<div className="text-sm font-semibold">{formatCents(payment.amount)}</div>
											<div className="text-xs text-muted-foreground">
												{payment.description || 'Stripe payment intent'}
											</div>
										</div>
										<div className="text-xs text-muted-foreground">{payment.createdAt ?? 'Date pending'}</div>
									</div>
								))
							) : (
								<div className="text-sm text-muted-foreground">No payments recorded yet.</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	)
}
