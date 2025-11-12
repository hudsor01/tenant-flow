'use client'

import { CrudDialog, CrudDialogContent, CrudDialogHeader, CrudDialogTitle, CrudDialogDescription, CrudDialogBody, CrudDialogFooter } from '#components/ui/crud-dialog'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Slider } from '#components/ui/slider'
import { Spinner } from '#components/ui/spinner'
import {
	useLateFeeConfig,
	useUpdateLateFeeConfig
} from '#hooks/api/use-late-fees'
import { Calendar, DollarSign, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface LateFeeConfigDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	leaseId: string
	onSuccess?: () => void
}

import { formatCurrency } from '@repo/shared/utils/currency'


export function LateFeeConfigDialog({
	open,
	onOpenChange,
	leaseId,
	onSuccess
}: LateFeeConfigDialogProps) {
	const { data: config, isLoading } = useLateFeeConfig(leaseId)
	const updateConfig = useUpdateLateFeeConfig()

	const [gracePeriodDays, setGracePeriodDays] = useState<number>(5)
	const [flatFeeAmount, setFlatFeeAmount] = useState<number>(50)

	useEffect(() => {
		if (config) {
			setGracePeriodDays(config.gracePeriodDays ?? 0)
			setFlatFeeAmount(config.flatFeeAmount ?? 50)
		}
	}, [config])

	useEffect(() => {
		if (!open && config) {
			setGracePeriodDays(config.gracePeriodDays ?? 0)
			setFlatFeeAmount(config.flatFeeAmount ?? 50)
		}
	}, [open, config])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

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

	return (
		<CrudDialog mode="edit" open={open} onOpenChange={onOpenChange}>
			<CrudDialogContent className="sm:max-w-125">
				<form onSubmit={handleSubmit}>
					<CrudDialogHeader>
						<CrudDialogTitle>Configure Late Fees</CrudDialogTitle>
						<CrudDialogDescription>
							Set the grace period and flat fee amount for late rent payments
						</CrudDialogDescription>
					</CrudDialogHeader>
					<CrudDialogBody>
						{isLoading ? (
							<div className="flex items-center justify-center section-spacing-compact">
								<Spinner className="size-6 animate-spin text-accent-main" />
							</div>
						) : (
							<div className="space-y-6 mt-4">
								<div className="space-y-3">
									<Label
										htmlFor="grace-period"
										className="text-label-secondary text-xs font-medium uppercase tracking-[0.01em]"
									>
										Grace Period
									</Label>
									<div className="flex items-center gap-4">
										<Calendar className="size-5 text-label-tertiary shrink-0" />
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
										<Info className="size-4 text-accent-main shrink-0 mt-0.5" />
										<p className="text-xs text-label-secondary">
											Late fees will be applied to payments that are overdue by more
											than {gracePeriodDays}{' '}
											{gracePeriodDays === 1 ? 'day' : 'days'} after the due date.
										</p>
									</div>
								</div>

								<div className="space-y-3">
									<Label
										htmlFor="flat-fee"
										className="text-label-secondary text-xs font-medium uppercase tracking-[0.01em]"
									>
										Flat Fee Amount
									</Label>
									<div className="flex items-center gap-4">
										<DollarSign className="size-5 text-label-tertiary shrink-0" />
										<div className="flex-1 space-y-2">
											<div className="relative">
												<span className="absolute left-3 top-1/2 translate-y-[-50%] text-sm text-label-tertiary">
													$
												</span>
												<Input
													id="flat-fee"
													name="flatFee"
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
												<span>Min: {formatCurrency(0)}</span>
												<span>Max: {formatCurrency(500)}</span>
											</div>
										</div>
									</div>
									<div className="flex items-start gap-2 rounded-lg bg-fill-tertiary p-3">
										<Info className="size-4 text-accent-main shrink-0 mt-0.5" />
										<p className="text-xs text-label-secondary">
											This flat fee will be added to each late payment.
										</p>
									</div>
								</div>
							</div>
						)}
					</CrudDialogBody>
					<CrudDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={updateConfig.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateConfig.isPending}>
							{updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
						</Button>
					</CrudDialogFooter>
				</form>
			</CrudDialogContent>
		</CrudDialog>
	)
}
