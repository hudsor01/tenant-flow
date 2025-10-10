/**
 * Renew Lease Dialog
 * Phase 6.3: Lease Renewals
 *
 * Interface for renewing leases with optional rent increases
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useRenewLease } from '@/hooks/api/use-leases'
import { toast } from 'sonner'
import { Spinner } from "@/components/ui/spinner"
import { format, addMonths, addYears, isAfter, parseISO } from 'date-fns'
import type { Database } from '@repo/shared/types/supabase-generated'
import { Calendar, DollarSign, Info, TrendingUp } from 'lucide-react'

type Lease = Database['public']['Tables']['Lease']['Row']

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
		if (lease.endDate && !isAfter(parseISO(newEndDate), parseISO(lease.endDate))) {
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

		renewLease.mutate(
			{
				leaseId: lease.id,
				data: {
					endDate: newEndDate,
					...(showRentIncrease && { rentAmount: newRent })
				}
			},
			{
				onSuccess: () => {
					onSuccess?.()
					onOpenChange(false)
					// Reset form
					setNewEndDate(defaultNewEndDate)
					setNewRentAmount('')
					setShowRentIncrease(false)
				}
			}
		)
	}

	const handleCancel = () => {
		onOpenChange(false)
		// Reset form
		setNewEndDate(defaultNewEndDate)
		setNewRentAmount('')
		setShowRentIncrease(false)
	}

	// Quick date presets
	const handleQuickDate = (months: number) => {
		if (!lease.endDate) return
		const newDate = addMonths(parseISO(lease.endDate), months)
		setNewEndDate(format(newDate, 'yyyy-MM-dd'))
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Renew Lease</DialogTitle>
					<DialogDescription>
						Create a new lease term with optional rent adjustment
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
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
							className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
						>
							New End Date
						</Label>
						<div className="flex items-center gap-4">
							<Calendar className="h-5 w-5 text-label-tertiary flex-shrink-0" />
							<Input
								id="end-date"
								type="date"
								value={newEndDate}
								onChange={e => setNewEndDate(e.target.value)}
								min={
									lease.endDate
										? format(addMonths(parseISO(lease.endDate), 1), 'yyyy-MM-dd')
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

					{/* Rent Increase Toggle */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]">
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
									<DollarSign className="h-5 w-5 text-label-tertiary flex-shrink-0" />
									<div className="flex-1 relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-label-tertiary">
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
											<TrendingUp className="h-4 w-4 text-accent-main" />
											<span className="text-sm font-medium text-label-primary">
												Rent Change
											</span>
										</div>
										<div className="space-y-1 text-sm">
											<div className="flex justify-between">
												<span className="text-label-secondary">
													Current:
												</span>
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
								<Info className="h-4 w-4 text-accent-main flex-shrink-0 mt-0.5" />
								<p className="text-xs text-label-secondary">
									New lease will maintain current rent of{' '}
									{formatCurrency(currentRent)}/month
								</p>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={renewLease.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={renewLease.isPending}>
							{renewLease.isPending && (
								<Spinner className="mr-2 h-4 w-4 animate-spin" />
							)}
							{renewLease.isPending ? 'Renewing...' : 'Renew Lease'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
