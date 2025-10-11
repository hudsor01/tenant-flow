/**
 * Late Fee Configuration Dialog
 * Phase 6.1: Late Fee System
 *
 * Interface for configuring late fee settings per lease
 */

'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import {
	useLateFeeConfig,
	useUpdateLateFeeConfig
} from '@/hooks/api/use-late-fees'
import { Calendar, DollarSign, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface LateFeeConfigDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	leaseId: string
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
 * Main dialog component for late fee configuration
 */
export function LateFeeConfigDialog({
	open,
	onOpenChange,
	leaseId,
	onSuccess
}: LateFeeConfigDialogProps) {
	const { data: config, isLoading } = useLateFeeConfig(leaseId)
	const updateConfig = useUpdateLateFeeConfig()

	// Local state for form
	const [gracePeriodDays, setGracePeriodDays] = useState<number>(5)
	const [flatFeeAmount, setFlatFeeAmount] = useState<number>(50)

	// Initialize form from config
	useEffect(() => {
		if (config) {
			setGracePeriodDays(config.gracePeriodDays)
			setFlatFeeAmount(config.flatFeeAmount)
		}
	}, [config])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validation
		if (gracePeriodDays < 0 || gracePeriodDays > 30) {
			toast.error('Grace period must be between 0 and 30 days')
			return
		}

		if (flatFeeAmount < 0 || flatFeeAmount > 500) {
			toast.error('Flat fee must be between $0 and $500')
			return
		}

		updateConfig.mutate(
			{
				leaseId,
				gracePeriodDays,
				flatFeeAmount
			},
			{
				onSuccess: () => {
					onSuccess?.()
					onOpenChange(false)
				}
			}
		)
	}

	const handleCancel = () => {
		onOpenChange(false)
		// Reset form to current config
		if (config) {
			setGracePeriodDays(config.gracePeriodDays)
			setFlatFeeAmount(config.flatFeeAmount)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Configure Late Fees</DialogTitle>
					<DialogDescription>
						Set the grace period and flat fee amount for late rent payments
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Spinner className="h-6 w-6 animate-spin text-accent-main" />
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-6 mt-4">
						{/* Grace Period Slider */}
						<div className="space-y-3">
							<Label
								htmlFor="grace-period"
								className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
							>
								Grace Period
							</Label>
							<div className="flex items-center gap-4">
								<Calendar className="h-5 w-5 text-label-tertiary flex-shrink-0" />
								<div className="flex-1 space-y-2">
									<Slider
										id="grace-period"
										min={0}
										max={30}
										step={1}
										value={[gracePeriodDays]}
										onValueChange={([value]) =>
											value !== undefined && setGracePeriodDays(value)
										}
										className="w-full"
									/>
									<div className="flex justify-between text-xs text-label-tertiary">
										<span>0 days</span>
										<span className="font-semibold text-label-primary">
											{gracePeriodDays} {gracePeriodDays === 1 ? 'day' : 'days'}
										</span>
										<span>30 days</span>
									</div>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg bg-fill-tertiary p-3">
								<Info className="h-4 w-4 text-accent-main flex-shrink-0 mt-0.5" />
								<p className="text-xs text-label-secondary">
									Late fees will be applied to payments that are overdue by more
									than {gracePeriodDays}{' '}
									{gracePeriodDays === 1 ? 'day' : 'days'} after the due date
								</p>
							</div>
						</div>

						{/* Flat Fee Amount Input */}
						<div className="space-y-3">
							<Label
								htmlFor="flat-fee"
								className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
							>
								Flat Fee Amount
							</Label>
							<div className="flex items-center gap-4">
								<DollarSign className="h-5 w-5 text-label-tertiary flex-shrink-0" />
								<div className="flex-1 space-y-2">
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-label-tertiary">
											$
										</span>
										<Input
											id="flat-fee"
											type="number"
											min="0"
											max="500"
											step="1"
											value={flatFeeAmount}
											onChange={e => setFlatFeeAmount(Number(e.target.value))}
											className="pl-7"
										/>
									</div>
									<div className="flex justify-between text-xs text-label-tertiary">
										<span>Min: $0</span>
										<span>Max: $500</span>
									</div>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg bg-fill-tertiary p-3">
								<Info className="h-4 w-4 text-accent-main flex-shrink-0 mt-0.5" />
								<p className="text-xs text-label-secondary">
									This flat fee of {formatCurrency(flatFeeAmount)} will be
									charged for any payment that exceeds the grace period
								</p>
							</div>
						</div>

						{/* Preview Summary */}
						<div className="rounded-lg border border-separator bg-fill-tertiary p-4">
							<h4 className="text-sm font-semibold text-label-primary mb-3">
								Configuration Summary
							</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-label-secondary">Grace Period:</span>
									<span className="font-medium text-label-primary">
										{gracePeriodDays} {gracePeriodDays === 1 ? 'day' : 'days'}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-label-secondary">Late Fee:</span>
									<span className="font-medium text-label-primary">
										{formatCurrency(flatFeeAmount)}
									</span>
								</div>
								<div className="pt-2 mt-2 border-t border-separator">
									<p className="text-xs text-label-tertiary">
										Example: A payment due on Jan 1 would incur a{' '}
										{formatCurrency(flatFeeAmount)} late fee if paid on or after
										Jan {gracePeriodDays + 2}
									</p>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={updateConfig.isPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateConfig.isPending}>
								{updateConfig.isPending && (
									<Spinner className="mr-2 h-4 w-4 animate-spin" />
								)}
								{updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
