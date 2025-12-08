'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { TenantPaymentRecord } from '@repo/shared/types/api-contracts'
import { useTenantPaymentsHistory } from '#hooks/api/use-tenant-payments'
import { useTenantAutopayStatus } from '#hooks/api/use-tenant-portal'
import { formatCents } from '@repo/shared/lib/format'
import { CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function TenantPaymentsPage() {
	const paymentsQuery = useTenantPaymentsHistory({ limit: 20 })
	const { data: autopayStatus, isLoading: isLoadingAutopay } =
		useTenantAutopayStatus()

	const isAutopayEnabled = autopayStatus?.autopayEnabled ?? false

	return (
		<section className="flex-1 space-y-6 px-6 py-8">
			{/* Autopay Status Section */}
			{!isLoadingAutopay && autopayStatus && (
				<Card data-testid="autopay-status-section">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<CardTitle>Autopay Status</CardTitle>
								{isAutopayEnabled ? (
									<Badge variant="success" className="flex items-center gap-1">
										<CheckCircle2 className="size-3" />
										Autopay Active
									</Badge>
								) : (
									<Badge
										variant="secondary"
										className="flex items-center gap-1"
									>
										<XCircle className="size-3" />
										Autopay Not Set Up
									</Badge>
								)}
							</div>
							<Link href="/tenant/payments/autopay">
								<Button variant={isAutopayEnabled ? 'outline' : 'default'}>
									{isAutopayEnabled ? 'Manage Autopay' : 'Setup Autopay'}
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							{isAutopayEnabled
								? 'Your rent payments are automatically processed each month. You can manage your autopay settings or disable it at any time.'
								: 'Set up autopay to automatically pay your rent each month and never miss a payment.'}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Payment History */}
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
								paymentsQuery.data.payments.map(
									(payment: TenantPaymentRecord) => (
										<div key={payment.id} className="flex-between py-3">
											<div>
												<div className="text-sm font-semibold">
													{formatCents(payment.amount)}
												</div>
												<div className="text-caption">
													{payment.description || 'Stripe payment intent'}
												</div>
											</div>
											<div className="text-caption">
												{payment.created_at ?? 'Date pending'}
											</div>
										</div>
									)
								)
							) : (
								<div className="text-muted">No payments recorded yet.</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</section>
	)
}
