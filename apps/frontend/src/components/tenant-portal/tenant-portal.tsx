'use client'

import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Button } from '#components/ui/button'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'
import { TenantStatsCards, type RentStatus } from './tenant-stats-cards'
import { PaymentHistoryCard } from './payment-history-card'
import {
	MaintenanceRequestsCard,
	type MaintenanceRequestStatus
} from './maintenance-requests-card'
import { DocumentsSection } from './documents-section'

interface TenantPortalProps {
	// Profile
	tenantFirstName: string
	propertyName: string
	unitNumber: string

	// Rent info
	rentAmount: number
	rentDueDate: string
	rentStatus: RentStatus
	daysUntilDue: number

	// Payments
	payments: Array<{
		id: string
		amount: number
		paidDate: string
		receiptUrl?: string | undefined
	}>

	// Maintenance
	maintenanceRequests: Array<{
		id: string
		title: string
		status: MaintenanceRequestStatus
	}>

	// Documents
	documents: Array<{
		id: string
		name: string
		uploadedAt: string
		downloadUrl?: string | undefined
	}>

	// Callbacks
	onPayRent?: (() => void) | undefined
	onDownloadReceipt?: ((paymentId: string) => void) | undefined
	onSubmitRequest?: (() => void) | undefined
	onViewRequest?: ((requestId: string) => void) | undefined
	onDownloadDocument?: ((documentId: string) => void) | undefined
}

export function TenantPortal({
	tenantFirstName,
	propertyName,
	unitNumber,
	rentAmount,
	rentDueDate,
	rentStatus,
	daysUntilDue,
	payments,
	maintenanceRequests,
	documents,
	onPayRent,
	onDownloadReceipt,
	onSubmitRequest,
	onViewRequest,
	onDownloadDocument
}: TenantPortalProps) {
	const openRequestsCount = maintenanceRequests.filter(
		r => r.status === 'open' || r.status === 'in_progress'
	).length

	return (
		<div className="min-h-screen bg-background">
			<main className="max-w-5xl mx-auto px-6 py-8">
				{/* Welcome Section */}
				<BlurFade delay={0.15} inView>
					<div className="mb-6">
						<h2 className="text-2xl font-semibold text-foreground">
							Welcome back, {tenantFirstName}
						</h2>
						<p className="text-muted-foreground">
							Unit {unitNumber} - {propertyName}
						</p>
					</div>
				</BlurFade>

				{/* Stats Cards */}
				<TenantStatsCards
					nextPaymentAmount={rentAmount}
					nextPaymentDueDate={rentDueDate}
					rentStatus={rentStatus}
					daysUntilDue={daysUntilDue}
					openRequestsCount={openRequestsCount}
					documentsCount={documents.length}
				/>

				{/* Rent Payment Card */}
				<BlurFade delay={0.4} inView>
					<div className="bg-card border border-border rounded-lg p-6 mb-6 relative overflow-hidden">
						{rentStatus !== 'paid' && (
							<BorderBeam
								size={120}
								duration={10}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
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
										{rentStatus === 'paid'
											? 'Your rent is paid for this month'
											: `${formatCurrency(rentAmount / 100)} due ${formatDate(rentDueDate)}`}
									</p>
								</div>
							</div>
							{rentStatus !== 'paid' && (
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

				{/* Two Column Layout */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Payment History */}
					<PaymentHistoryCard
						payments={payments}
						onDownloadReceipt={onDownloadReceipt}
					/>

					{/* Maintenance Requests */}
					<MaintenanceRequestsCard
						requests={maintenanceRequests}
						onViewRequest={onViewRequest}
						onSubmitRequest={onSubmitRequest}
					/>
				</div>

				{/* Documents Section */}
				<DocumentsSection
					documents={documents}
					onDownloadDocument={onDownloadDocument}
				/>
			</main>
		</div>
	)
}
