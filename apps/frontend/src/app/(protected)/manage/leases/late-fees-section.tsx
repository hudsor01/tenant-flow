/**
 * Late Fees Section Component
 * Phase 6.1: Late Fee System
 *
 * Inline component for displaying and managing late fees within lease details
 * Designed to be embedded directly in lease detail pages
 */

'use client'

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Spinner } from '@/components/ui/spinner'
import {
	useApplyLateFee,
	useOverduePayments,
	useProcessLateFees
} from '@/hooks/api/use-late-fees'
import { format } from 'date-fns'
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	DollarSign,
	Settings
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LateFeeConfigDialog } from './late-fee-config-dialog'

interface LateFeesSectionProps {
	leaseId: string
	onConfigChange?: () => void
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount)
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
	return format(new Date(dateString), 'MMM d, yyyy')
}

/**
 * Inline card component for single overdue payment
 */
function OverduePaymentCard({
	payment,
	gracePeriod,
	onApplyLateFee
}: {
	payment: {
		id: string
		amount: number
		dueDate: string
		daysOverdue: number
		lateFeeApplied: boolean
	}
	gracePeriod: number
	onApplyLateFee: (
		paymentId: string,
		lateFeeAmount: number,
		reason: string
	) => void
}) {
	const daysOverGrace = payment.daysOverdue - gracePeriod

	return (
		<div className="rounded-lg border border-separator bg-fill-secondary p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2">
						{payment.lateFeeApplied ? (
							<CheckCircle className="h-4 w-4 text-success-main flex-shrink-0" />
						) : (
							<AlertCircle className="h-4 w-4 text-error-main flex-shrink-0" />
						)}
						<span className="text-sm font-medium text-label-primary">
							{formatCurrency(payment.amount)} Rent Payment
						</span>
					</div>

					<div className="space-y-1 text-xs text-label-secondary">
						<div className="flex items-center gap-2">
							<Calendar className="h-3 w-3 text-label-tertiary" />
							<span>Due: {formatDate(payment.dueDate)}</span>
						</div>
						<div className="flex items-center gap-2">
							<AlertCircle className="h-3 w-3 text-label-tertiary" />
							<span>
								{payment.daysOverdue} days overdue ({daysOverGrace} days past
								grace period)
							</span>
						</div>
					</div>

					{payment.lateFeeApplied && (
						<div className="flex items-center gap-1 text-xs text-success-main">
							<CheckCircle className="h-3 w-3" />
							<span>Late fee already applied</span>
						</div>
					)}
				</div>

				{!payment.lateFeeApplied && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							const reason = `Payment ${daysOverGrace} days past due (after ${gracePeriod}-day grace period)`
							// Default flat fee of $50 - will be customizable in dialog if needed
							onApplyLateFee(payment.id, 50, reason)
						}}
					>
						Apply Fee
					</Button>
				)}
			</div>
		</div>
	)
}

/**
 * Main late fees section component
 */
export function LateFeesSection({
	leaseId,
	onConfigChange
}: LateFeesSectionProps) {
	const [showConfigDialog, setShowConfigDialog] = useState(false)
	const { data, isLoading, error } = useOverduePayments(leaseId)
	const processLateFees = useProcessLateFees()
	const applyLateFee = useApplyLateFee()

	const overduePayments = data?.payments || []
	const gracePeriod = data?.gracePeriod || 5

	const handleProcessAll = () => {
		if (overduePayments.length === 0) {
			toast.info('No overdue payments to process')
			return
		}

		processLateFees.mutate(leaseId)
	}

	const handleApplyLateFee = (
		paymentId: string,
		lateFeeAmount: number,
		reason: string
	) => {
		applyLateFee.mutate({
			paymentId,
			lateFeeAmount,
			reason
		})
	}

	const handleConfigSuccess = () => {
		onConfigChange?.()
	}

	return (
		<>
			<CardLayout
				title="Late Fees"
				description="Manage overdue payments and late fee configuration"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							{/* Grace Period Info */}
							<div className="rounded-lg bg-fill-tertiary p-3">
								<div className="flex items-start gap-2">
									<Calendar className="h-4 w-4 text-accent-main flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<p className="text-sm text-label-primary">
											Grace Period: {gracePeriod}{' '}
											{gracePeriod === 1 ? 'day' : 'days'}
										</p>
										<p className="text-xs text-label-tertiary mt-1">
											Late fees are applied to payments overdue by more than{' '}
											{gracePeriod} {gracePeriod === 1 ? 'day' : 'days'}
										</p>
									</div>
								</div>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowConfigDialog(true)}
						>
							<Settings className="mr-2 h-4 w-4" />
							Configure
						</Button>
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className="flex items-center justify-center py-8">
							<Spinner className="h-6 w-6 animate-spin text-accent-main" />
						</div>
					)}

					{/* Error State */}
					{error && (
						<div className="rounded-lg border border-error-main bg-error-background p-4">
							<div className="flex items-start gap-2">
								<AlertCircle className="h-5 w-5 text-error-main flex-shrink-0" />
								<div>
									<p className="text-sm font-medium text-error-main">
										Failed to load overdue payments
									</p>
									<p className="text-xs text-label-secondary mt-1">
										{error.message}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* No Overdue Payments */}
					{!isLoading && !error && overduePayments.length === 0 && (
						<div className="rounded-lg border border-success-main bg-success-background p-4">
							<div className="flex items-center gap-2">
								<CheckCircle className="h-5 w-5 text-success-main" />
								<p className="text-sm text-label-primary">
									No overdue payments at this time
								</p>
							</div>
						</div>
					)}

					{/* Overdue Payments List */}
					{!isLoading && !error && overduePayments.length > 0 && (
						<>
							<div className="space-y-3">
								{overduePayments.map(payment => (
									<OverduePaymentCard
										key={payment.id}
										payment={payment}
										gracePeriod={gracePeriod}
										onApplyLateFee={handleApplyLateFee}
									/>
								))}
							</div>

							{/* Batch Process Button */}
							<div className="flex items-center justify-between gap-4 pt-2">
								<div className="flex items-center gap-2 text-sm text-label-secondary">
									<DollarSign className="h-4 w-4" />
									<span>
										{overduePayments.filter(p => !p.lateFeeApplied).length}{' '}
										payment(s) eligible for late fees
									</span>
								</div>
								<Button
									onClick={handleProcessAll}
									disabled={
										processLateFees.isPending ||
										overduePayments.every(p => p.lateFeeApplied)
									}
								>
									{processLateFees.isPending && (
										<Spinner className="mr-2 h-4 w-4 animate-spin" />
									)}
									{processLateFees.isPending
										? 'Processing...'
										: 'Process All Late Fees'}
								</Button>
							</div>
						</>
					)}
				</div>
			</CardLayout>

			{/* Configuration Dialog */}
			<LateFeeConfigDialog
				open={showConfigDialog}
				onOpenChange={setShowConfigDialog}
				leaseId={leaseId}
				onSuccess={handleConfigSuccess}
			/>
		</>
	)
}
