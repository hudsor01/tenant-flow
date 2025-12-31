'use client'

import { TenantPortal } from '#components/tenant-portal/tenant-portal'
import type { RentStatus } from '#components/tenant-portal/tenant-stats-cards'
import {
	TenantOnboardingTour,
	TenantTourTrigger
} from '#components/tours/tenant-onboarding-tour'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import {
	useTenantPortalDashboard,
	useTenantLeaseDocuments
} from '#hooks/api/use-tenant-portal'
import { tenantPortalQueries } from '#hooks/api/use-tenant-portal'
import { useQuery } from '@tanstack/react-query'
import { PenLine } from 'lucide-react'
import Link from 'next/link'

/**
 * Tenant Portal Dashboard
 *
 * Design-OS aligned self-service portal for tenants to:
 * - View their lease information
 * - Pay rent with animated stats cards
 * - View payment history with download receipts
 * - Submit and track maintenance requests
 * - Access documents
 *
 * Layout follows design-os specification:
 * - Centered max-w-5xl layout
 * - BlurFade animations on all sections
 * - BorderBeam accents for payment status
 * - NumberTicker for animated values
 */
export default function TenantDashboardPage() {
	const { data, isLoading } = useTenantPortalDashboard()
	const { data: documentsData, isLoading: isLoadingDocuments } =
		useTenantLeaseDocuments()
	const { data: amountDue, isLoading: isLoadingAmountDue } = useQuery(
		tenantPortalQueries.amountDue()
	)
	// Autopay status query - data available for future use if needed
	const _autopayQuery = useQuery(tenantPortalQueries.autopay())

	const activeLease = data?.lease
	const recentPayments = data?.payments?.recent ?? []
	const maintenanceRequests = data?.maintenance?.recent ?? []
	const documents = documentsData?.documents ?? []

	// Check if lease needs tenant signature
	const needsSignature =
		activeLease?.lease_status === 'pending_signature' &&
		!activeLease?.tenant_signed_at

	// Calculate rent status for display
	const getRentStatus = (): RentStatus => {
		if (isLoadingAmountDue) return 'upcoming'
		if (amountDue?.already_paid) return 'paid'
		if (amountDue && amountDue.days_late > 0) return 'overdue'

		// Check if due within 0 days
		if (amountDue?.due_date) {
			const dueDate = new Date(amountDue.due_date)
			const today = new Date()
			const daysUntilDue = Math.ceil(
				(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			)
			if (daysUntilDue === 0) return 'due_today'
		}
		return 'upcoming'
	}

	// Calculate days until due
	const getDaysUntilDue = (): number => {
		if (!amountDue?.due_date) return 0
		const dueDate = new Date(amountDue.due_date)
		const today = new Date()
		return Math.ceil(
			(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
		)
	}

	// Get tenant name from settings or lease
	const tenantFirstName = 'Tenant' // Fallback, could come from settings

	// Property info from lease
	const propertyName = activeLease?.unit?.property?.name ?? 'Your Property'
	const unitNumber = activeLease?.unit?.unit_number ?? ''

	// Format payments for component
	const formattedPayments = recentPayments.map(payment => ({
		id: payment.id,
		amount: payment.amount,
		paidDate: payment.paidAt ?? payment.created_at,
		receiptUrl: payment.receiptUrl ?? undefined
	}))

	// Format maintenance requests for component
	const formattedRequests = maintenanceRequests.map(request => ({
		id: request.id,
		title: request.title,
		status: mapMaintenanceStatus(request.status)
	}))

	// Format documents for component
	const formattedDocuments = documents.map(doc => ({
		id: doc.id,
		name: doc.name,
		uploadedAt: doc.created_at ?? new Date().toISOString(),
		downloadUrl: doc.url ?? undefined
	}))

	// Rent amount (in cents)
	const rentAmount =
		amountDue?.total_due_cents ?? (activeLease?.rent_amount ?? 0) * 100
	const rentDueDate = amountDue?.due_date ?? new Date().toISOString()

	// Handlers
	const handleDownloadReceipt = (paymentId: string) => {
		const payment = recentPayments.find(p => p.id === paymentId)
		if (payment?.receiptUrl) {
			window.open(payment.receiptUrl, '_blank')
		}
	}

	const handleDownloadDocument = (documentId: string) => {
		const doc = documents.find(d => d.id === documentId)
		if (doc?.url) {
			window.open(doc.url, '_blank')
		}
	}

	if (isLoading || isLoadingDocuments) {
		return (
			<div className="min-h-screen bg-background">
				<main className="max-w-5xl mx-auto px-6 py-8">
					<div className="mb-6">
						<Skeleton className="h-8 w-64 mb-2" />
						<Skeleton className="h-5 w-48" />
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-32 rounded-lg" />
						))}
					</div>
					<Skeleton className="h-24 rounded-lg mb-6" />
					<div className="grid gap-6 lg:grid-cols-2">
						<Skeleton className="h-64 rounded-lg" />
						<Skeleton className="h-64 rounded-lg" />
					</div>
					<Skeleton className="h-48 rounded-lg mt-6" />
				</main>
			</div>
		)
	}

	return (
		<>
			<TenantOnboardingTour />

			{/* Pending Signature Alert */}
			{needsSignature && activeLease && (
				<div className="max-w-5xl mx-auto px-6 pt-6">
					<BlurFade delay={0.1} inView>
						<div
							className="rounded-lg border border-warning/20 bg-warning/10 dark:border-warning/80 dark:bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
							data-testid="pending-signature"
						>
							<div className="flex items-center gap-3">
								<div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20 dark:bg-warning/20">
									<PenLine
										className="size-5 text-warning dark:text-warning"
										aria-hidden="true"
									/>
								</div>
								<div>
									<p className="font-semibold text-warning dark:text-warning-foreground">
										Lease Agreement Pending Your Signature
									</p>
									<p className="text-sm text-warning dark:text-warning">
										Please review and sign your lease agreement to complete the
										process.
									</p>
								</div>
							</div>
							<Button asChild className="gap-2">
								<Link href="/tenant/lease">
									<PenLine className="size-4" aria-hidden="true" />
									Sign Lease
								</Link>
							</Button>
						</div>
					</BlurFade>
				</div>
			)}

			<TenantPortal
				tenantFirstName={tenantFirstName}
				propertyName={propertyName}
				unitNumber={unitNumber}
				rentAmount={rentAmount}
				rentDueDate={rentDueDate}
				rentStatus={getRentStatus()}
				daysUntilDue={getDaysUntilDue()}
				payments={formattedPayments}
				maintenanceRequests={formattedRequests}
				documents={formattedDocuments}
				onDownloadReceipt={handleDownloadReceipt}
				onDownloadDocument={handleDownloadDocument}
			/>

			{/* Tour Trigger */}
			<div className="fixed bottom-6 right-6 z-50">
				<TenantTourTrigger />
			</div>
		</>
	)
}

/**
 * Map backend maintenance status to design-os status format
 */
function mapMaintenanceStatus(
	status: string
): 'open' | 'in_progress' | 'completed' | 'cancelled' {
	const statusMap: Record<
		string,
		'open' | 'in_progress' | 'completed' | 'cancelled'
	> = {
		PENDING: 'open',
		IN_PROGRESS: 'in_progress',
		COMPLETED: 'completed',
		CANCELED: 'cancelled',
		CANCELLED: 'cancelled'
	}
	return statusMap[status] ?? 'open'
}
