import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { formatCurrency } from '#lib/formatters/currency'
import { addMonths, format, parseISO } from 'date-fns'
import { Calendar, DollarSign, Info, TrendingUp } from 'lucide-react'

interface CurrentLeaseInfoProps {
	currentRent: number
	endDate: string | null
}

export function CurrentLeaseInfo({ currentRent, endDate }: CurrentLeaseInfoProps) {
	return (
		<div className="rounded-lg border border-separator bg-fill-tertiary p-4">
			<h4 className="text-sm font-semibold text-label-primary mb-2">Current Lease</h4>
			<div className="space-y-1 text-sm text-label-secondary">
				<div className="flex justify-between">
					<span>Current Rent:</span>
					<span className="font-medium text-label-primary">{formatCurrency(currentRent)}/mo</span>
				</div>
				{endDate && (
					<div className="flex justify-between">
						<span>Ends:</span>
						<span className="font-medium text-label-primary">
							{format(parseISO(endDate), 'MMM d, yyyy')}
						</span>
					</div>
				)}
			</div>
		</div>
	)
}

interface DateSelectorProps {
	newEndDate: string
	leaseEndDate: string | null
	onDateChange: (date: string) => void
	onQuickDate: (months: number) => void
}

export function DateSelector({ newEndDate, leaseEndDate, onDateChange, onQuickDate }: DateSelectorProps) {
	return (
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
					onChange={e => onDateChange(e.target.value)}
					min={
						leaseEndDate
							? format(addMonths(parseISO(leaseEndDate), 1), 'yyyy-MM-dd')
							: undefined
					}
					className="flex-1"
				/>
			</div>
			{leaseEndDate && (
				<div className="flex gap-2">
					<Button type="button" variant="outline" size="sm" onClick={() => onQuickDate(6)}>
						+6 months
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => onQuickDate(12)}>
						+12 months
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => onQuickDate(24)}>
						+24 months
					</Button>
				</div>
			)}
		</div>
	)
}

interface RentAdjustmentProps {
	showRentIncrease: boolean
	currentRent: number
	newRentAmount: string
	onToggle: () => void
	onRentChange: (value: string) => void
}

export function RentAdjustment({
	showRentIncrease,
	currentRent,
	newRentAmount,
	onToggle,
	onRentChange
}: RentAdjustmentProps) {
	const newRent = newRentAmount ? Number(newRentAmount) : currentRent
	const rentIncreaseAmount = newRent - currentRent
	const rentIncreasePercent = currentRent > 0 ? (rentIncreaseAmount / currentRent) * 100 : 0

	return (
		<div className="space-y-3">
			<div className="flex-between">
				<Label className="text-label-secondary text-xs font-medium uppercase tracking-[0.01em]">
					Rent Adjustment
				</Label>
				<Button type="button" variant="outline" size="sm" onClick={onToggle}>
					{showRentIncrease ? 'Keep Same' : 'Adjust Rent'}
				</Button>
			</div>
			{showRentIncrease && (
				<div className="space-y-3">
					<div className="flex items-center gap-4">
						<DollarSign className="size-5 text-label-tertiary shrink-0" />
						<div className="flex-1 relative">
							<span className="absolute left-3 top-1/2 translate-y-[-50%] text-sm text-label-tertiary">$</span>
							<Input
								id="new-rent"
								type="number"
								min="0"
								step="1"
								value={newRentAmount}
								onChange={e => onRentChange(e.target.value)}
								placeholder={currentRent.toString()}
								className="pl-7"
							/>
						</div>
					</div>
					{newRentAmount && Number(newRentAmount) !== currentRent && (
						<div className="rounded-lg bg-fill-tertiary p-3">
							<div className="flex items-center gap-2 mb-2">
								<TrendingUp className="size-4 text-accent-main" />
								<span className="typography-small text-label-primary">Rent Change</span>
							</div>
							<div className="space-y-1 text-sm">
								<div className="flex justify-between">
									<span className="text-label-secondary">Current:</span>
									<span className="font-medium text-label-primary">{formatCurrency(currentRent)}/mo</span>
								</div>
								<div className="flex justify-between">
									<span className="text-label-secondary">New:</span>
									<span className="font-medium text-label-primary">{formatCurrency(newRent)}/mo</span>
								</div>
								<div className="flex justify-between pt-1 mt-1 border-t border-separator">
									<span className="text-label-secondary">Change:</span>
									<span className={`font-semibold ${rentIncreaseAmount >= 0 ? 'text-accent-main' : 'text-error-main'}`}>
										{rentIncreaseAmount >= 0 ? '+' : ''}{formatCurrency(rentIncreaseAmount)} ({rentIncreasePercent.toFixed(1)}%)
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
						New lease will maintain current rent of {formatCurrency(currentRent)}/month
					</p>
				</div>
			)}
		</div>
	)
}
