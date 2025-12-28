'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { TenantStatsCards, type RentStatus } from './tenant-stats-cards'
import { RentPaymentCard } from './rent-payment-card'
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
				<RentPaymentCard
					amount={rentAmount}
					dueDate={rentDueDate}
					status={rentStatus}
					onPayRent={onPayRent}
				/>

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
