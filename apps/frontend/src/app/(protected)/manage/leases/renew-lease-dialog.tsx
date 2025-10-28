/**
 * Renew Lease Dialog
 * Phase 6.3: Lease Renewals
 *
 * Interface for renewing leases with optional rent increases
 */

'use client'

import { EditDialog } from '#components/ui/base-dialogs'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { useRenewLease } from '#hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { addMonths, addYears, format, isAfter, parseISO } from 'date-fns'
import { Calendar, DollarSign, Info, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Lease = Database['public']['Tables']['lease']['Row']

interface RenewLeaseDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	lease: Lease
	onSuccess?: () => void
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
 * Main dialog component for lease renewal
 */
export function RenewLeaseDialog({
	open,
	onOpenChange,
	lease,
	onSuccess
}: RenewLeaseDialogProps) {
	const renewLease = useRenewLease()
	const logger = createLogger({ component: 'RenewLeaseDialog' })

	// Default to 12 months from current end date
	const defaultNewEndDate = lease.endDate
		? format(addYears(parseISO(lease.endDate), 1), 'yyyy-MM-dd')
		: format(addYears(new Date(), 1), 'yyyy-MM-dd')

	const [newEndDate, setNewEndDate] = useState<string>(defaultNewEndDate)
	const [newRentAmount, setNewRentAmount] = useState<string>('')
	const [showRentIncrease, setShowRentIncrease] = useState(false)

	// Calculate rent increase percentage
	const currentRent = lease.rentAmount || 0
	const newRent = newRentAmount ? Number(newRentAmount) : currentRent
	const rentIncreaseAmount = newRent - currentRent
	const rentIncreasePercent =
		currentRent > 0 ? (rentIncreaseAmount / currentRent) * 100 : 0

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validation
		if (!newEndDate) {
			toast.error('Please select an end date')
			return
		}

		// Validate date is after current end date
		if (
			lease.endDate &&
			!isAfter(parseISO(newEndDate), parseISO(lease.endDate))
		) {
			toast.error('New end date must be after current end date')
			return
		}

		// Validate rent amount if specified
		if (showRentIncrease) {
			const rentValue = Number(newRentAmount)
			if (!rentValue || rentValue <= 0) {
				toast.error('Please enter a valid rent amount')
				return
			}
		}

		try {
			await renewLease.mutateAsync({
				id: lease.id,
				newEndDate
			})
			toast.success('Lease renewed successfully')
			onSuccess?.()
			onOpenChange(false)
			// Reset form
			setNewEndDate(defaultNewEndDate)
			setNewRentAmount('')
			setShowRentIncrease(false)
		} catch (error) {
			logger.error('Failed to renew lease', { leaseId: lease.id }, error)
			toast.error('Failed to renew lease')
		}
	}

	// Quick date presets
	const handleQuickDate = (months: number) => {
		if (!lease.endDate) return
		const newDate = addMonths(parseISO(lease.endDate), months)
		setNewEndDate(format(newDate, 'yyyy-MM-dd'))
	}

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			// Reset form when dialog closes
			setNewEndDate(defaultNewEndDate)
			setNewRentAmount('')
			setShowRentIncrease(false)
		}
		onOpenChange(isOpen)
	}

	return (
		<EditDialog
			open={open}
			hideTrigger
			onOpenChange={handleDialogChange}
			title="Renew Lease"
			description="Create a new lease term with optional rent adjustment"
			formType="LEASE"
			isPending={renewLease.isPending}
			submitText="Renew Lease"
			submitPendingText="Renewing..."
			contentClassName="sm:max-w-125"
			onSubmit={handleSubmit}
		>
			{() => (
				<div className="space-y-6 mt-4">
					{/* Current Lease Info */}
					<div className="rounded-lg border border-separator bg-fill-tertiary p-4">
						<h4 className="text-sm font-semibold text-label-primary mb-2">
							Current Lease
						</h4>
						<div className="space-y-1 text-sm text-label-secondary">
							<div className="flex justify-between">
								<span>Current Rent:</span>
								<span className="font-medium text-label-primary">
									{formatCurrency(currentRent)}/mo
								</span>
							</div>
							{lease.endDate && (
								<div className="flex justify-between">
									<span>Ends:</span>
									<span className="font-medium text-label-primary">
										{format(parseISO(lease.endDate), 'MMM d, yyyy')}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* New End Date */}
					<div className="space-y-3">
						<Label
							htmlFor="end-date"
							className="text-label-secondary text-xs font-medium uppercase tracking-[0.01em]"
						>
							New End Date
						</Label>
						<div className="flex items-center gap-4">
							<Calendar className="size-5 text-label-tertiary shrink-0" />
							<Input
								id="end-date"
								type="date"
								value={newEndDate}
								onChange={e => setNewEndDate(e.target.value)}
								min={
									lease.endDate
										? format(
												addMonths(parseISO(lease.endDate), 1),
												'yyyy-MM-dd'
											)
										: undefined
								}
								className="flex-1"
							/>
						</div>

						{/* Quick date buttons */}
						{lease.endDate && (
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => handleQuickDate(6)}
								>
									+6 months
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => handleQuickDate(12)}
								>
									+12 months
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => handleQuickDate(24)}
								>
									+24 months
								</Button>
							</div>
						)}
					</div>

					{/* Rent Adjustment Toggle */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-label-secondary text-xs font-medium uppercase tracking-[0.01em]">
								Rent Adjustment
							</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setShowRentIncrease(!showRentIncrease)
									if (showRentIncrease) {
										setNewRentAmount('')
									}
								}}
							>
								{showRentIncrease ? 'Keep Same' : 'Adjust Rent'}
							</Button>
						</div>

						{showRentIncrease && (
							<div className="space-y-3">
								<div className="flex items-center gap-4">
									<DollarSign className="size-5 text-label-tertiary shrink-0" />
									<div className="flex-1 relative">
										<span className="absolute left-3 top-1/2 translate-y-[-50%] text-sm text-label-tertiary">
											$
										</span>
										<Input
											id="new-rent"
											type="number"
											min="0"
											step="1"
											value={newRentAmount}
											onChange={e => setNewRentAmount(e.target.value)}
											placeholder={currentRent.toString()}
											className="pl-7"
										/>
									</div>
								</div>

								{/* Rent increase preview */}
								{newRentAmount && Number(newRentAmount) !== currentRent && (
									<div className="rounded-lg bg-fill-tertiary p-3">
										<div className="flex items-center gap-2 mb-2">
											<TrendingUp className="size-4 text-accent-main" />
											<span className="text-sm font-medium text-label-primary">
												Rent Change
											</span>
										</div>
										<div className="space-y-1 text-sm">
											<div className="flex justify-between">
												<span className="text-label-secondary">Current:</span>
												<span className="font-medium text-label-primary">
													{formatCurrency(currentRent)}/mo
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-label-secondary">New:</span>
												<span className="font-medium text-label-primary">
													{formatCurrency(newRent)}/mo
												</span>
											</div>
											<div className="flex justify-between pt-1 mt-1 border-t border-separator">
												<span className="text-label-secondary">Change:</span>
												<span
													className={`font-semibold ${
														rentIncreaseAmount >= 0
															? 'text-accent-main'
															: 'text-error-main'
													}`}
												>
													{rentIncreaseAmount >= 0 ? '+' : ''}
													{formatCurrency(rentIncreaseAmount)} (
													{rentIncreasePercent.toFixed(1)}%)
												</span>
											</div>
										</div>
									</div>
								)}
							</div>
						)}

						{!showRentIncrease && (
							<div className="flex items-start gap-2 rounded-lg bg-fill-tertiary p-3">
								<Info className="size-4 text-accent-main shrink-0 mt-0.5" />
								<p className="text-xs text-label-secondary">
									New lease will maintain current rent of{' '}
									{formatCurrency(currentRent)}/month
								</p>
							</div>
						)}
					</div>
				</div>
			)}
		</EditDialog>
	)
}
