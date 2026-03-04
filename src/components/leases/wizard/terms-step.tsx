'use client'

/**
 * Lease Creation Wizard - Step 2: Terms
 * Dates and financial details with duration presets
 *
 * Note: Validation is handled by Zod schemas in #shared/validation/lease-wizard.schemas.ts
 * This component only handles display/input - uses type="text" with inputMode for mobile keyboards
 */
import { Button } from '#components/ui/button'
import {
	Field,
	FieldLabel,
	FieldDescription,
	FieldGroup
} from '#components/ui/field'
import { Input } from '#components/ui/input'
import { cn } from '#lib/utils'
import type { TermsStepData } from '#shared/validation/lease-wizard.schemas'

/** Duration preset in months. null = custom (no preset). */
export type DurationPreset = 1 | 6 | 12 | 24 | null

const DURATION_PRESETS: { label: string; months: Exclude<DurationPreset, null> }[] = [
	{ label: 'Month-to-month', months: 1 },
	{ label: '6 months', months: 6 },
	{ label: '12 months', months: 12 },
	{ label: '24 months', months: 24 }
]

/**
 * Calculate lease end date from start date + N months.
 * Advances by N months, then subtracts 1 day (e.g. Jan 1 + 12 months = Dec 31).
 */
export function calculateEndDate(startDate: string, months: number): string {
	const date = new Date(startDate)
	date.setMonth(date.getMonth() + months)
	date.setDate(date.getDate() - 1)
	return date.toISOString().slice(0, 10)
}

interface TermsStepProps {
	data: Partial<TermsStepData>
	onChange: (data: Partial<TermsStepData>) => void
	selectedDuration: DurationPreset
	onDurationChange: (duration: DurationPreset) => void
}

export function TermsStep({
	data,
	onChange,
	selectedDuration,
	onDurationChange
}: TermsStepProps) {
	const handleChange = (field: keyof TermsStepData, value: string | number) => {
		onChange({ ...data, [field]: value })
	}

	// Display cents as dollars (simple conversion for input value)
	const centsToDisplay = (cents: number | undefined): string => {
		if (cents === undefined || cents === 0) return ''
		return (cents / 100).toString()
	}

	// Parse dollars input to cents (strips non-numeric except decimal)
	const parseCents = (value: string): number => {
		const cleaned = value.replace(/[^0-9.]/g, '')
		const num = parseFloat(cleaned)
		return isNaN(num) ? 0 : Math.round(num * 100)
	}

	// Parse integer input (strips non-numeric)
	const parseInteger = (value: string): number => {
		const cleaned = value.replace(/[^0-9]/g, '')
		const num = parseInt(cleaned, 10)
		return isNaN(num) ? 0 : num
	}

	const handlePresetSelect = (months: Exclude<DurationPreset, null>) => {
		onDurationChange(months)
		if (data.start_date) {
			onChange({
				...data,
				end_date: calculateEndDate(data.start_date, months)
			})
		}
	}

	const handleStartDateChange = (startDate: string) => {
		const updates: Partial<TermsStepData> = { ...data, start_date: startDate }
		if (selectedDuration && startDate) {
			updates.end_date = calculateEndDate(startDate, selectedDuration)
		}
		onChange(updates)
	}

	const handleEndDateChange = (endDate: string) => {
		onDurationChange(null)
		onChange({ ...data, end_date: endDate })
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium mb-4">Lease Terms</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Set the lease duration and financial terms.
				</p>
			</div>

			{/* Duration Presets */}
			<FieldGroup>
				<h4 className="font-medium">Lease Duration</h4>
				<div className="flex flex-wrap gap-2">
					{DURATION_PRESETS.map(preset => (
						<Button
							key={preset.months}
							type="button"
							variant={selectedDuration === preset.months ? 'default' : 'outline'}
							size="sm"
							className={cn(
								'transition-colors',
								selectedDuration === preset.months && 'ring-2 ring-ring ring-offset-1'
							)}
							onClick={() => handlePresetSelect(preset.months)}
						>
							{preset.label}
						</Button>
					))}
				</div>

				{/* Dates */}
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="start_date">Start Date *</FieldLabel>
						<Input
							id="start_date"
							type="date"
							value={data.start_date}
							onChange={e => handleStartDateChange(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="end_date">End Date *</FieldLabel>
						<Input
							id="end_date"
							type="date"
							value={data.end_date}
							onChange={e => handleEndDateChange(e.target.value)}
						/>
						{selectedDuration && (
							<FieldDescription>
								Auto-calculated from preset
							</FieldDescription>
						)}
					</Field>
				</div>
			</FieldGroup>

			{/* Financial Terms */}
			<FieldGroup>
				<h4 className="font-medium">Financial Terms</h4>
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="rent_amount">Monthly Rent ($) *</FieldLabel>
						<Input
							id="rent_amount"
							type="text"
							inputMode="decimal"
							placeholder="1500.00"
							value={centsToDisplay(data.rent_amount)}
							onChange={e =>
								handleChange('rent_amount', parseCents(e.target.value))
							}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="security_deposit">
							Security Deposit ($)
						</FieldLabel>
						<Input
							id="security_deposit"
							type="text"
							inputMode="decimal"
							placeholder="1500.00"
							value={centsToDisplay(data.security_deposit)}
							onChange={e =>
								handleChange('security_deposit', parseCents(e.target.value))
							}
						/>
						<FieldDescription>Optional, defaults to $0</FieldDescription>
					</Field>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<Field>
						<FieldLabel htmlFor="payment_day">Monthly Due Date *</FieldLabel>
						<Input
							id="payment_day"
							type="text"
							inputMode="numeric"
							placeholder="1"
							value={data.payment_day}
							onChange={e =>
								handleChange('payment_day', parseInteger(e.target.value))
							}
						/>
						<FieldDescription>Day rent is due (1-31)</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="grace_period_days">
							Grace Period (days)
						</FieldLabel>
						<Input
							id="grace_period_days"
							type="text"
							inputMode="numeric"
							placeholder="3"
							value={data.grace_period_days ?? ''}
							onChange={e =>
								handleChange('grace_period_days', parseInteger(e.target.value))
							}
						/>
						<FieldDescription>Days before late fee</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="late_fee_amount">Late Fee ($)</FieldLabel>
						<Input
							id="late_fee_amount"
							type="text"
							inputMode="decimal"
							placeholder="50.00"
							value={centsToDisplay(data.late_fee_amount)}
							onChange={e =>
								handleChange('late_fee_amount', parseCents(e.target.value))
							}
						/>
						<FieldDescription>Optional, defaults to $0</FieldDescription>
					</Field>
				</div>
			</FieldGroup>
		</div>
	)
}
