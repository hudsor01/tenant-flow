'use client'

/**
 * Lease Creation Wizard - Step 2: Terms
 * Dates and financial details
 */
import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'
import type { TermsStepData } from '@repo/shared/validation/lease-wizard.schemas'

interface TermsStepProps {
	data: Partial<TermsStepData>
	onChange: (data: Partial<TermsStepData>) => void
}

export function TermsStep({ data, onChange }: TermsStepProps) {
	const handleChange = (field: keyof TermsStepData, value: string | number) => {
		onChange({ ...data, [field]: value })
	}

	// Format cents to dollars for display (only format when not actively editing)
	const centsToDisplay = (cents: number | undefined) => {
		if (cents === undefined || cents === 0) return ''
		return String(cents / 100)
	}

	// Parse dollars to cents for storage
	const dollarsToCents = (dollars: string) => {
		// Allow empty string
		if (!dollars || dollars.trim() === '') return 0
		// Remove any non-numeric characters except decimal point
		const cleaned = dollars.replace(/[^\d.]/g, '')
		const num = parseFloat(cleaned)
		if (isNaN(num)) return 0
		return Math.round(num * 100)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold mb-4">Lease Terms</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Set the lease duration and financial terms.
				</p>
			</div>

			{/* Dates */}
			<div className="space-y-4">
				<h4 className="font-medium">Lease Duration</h4>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="start_date">Start Date *</Label>
						<Input
							id="start_date"
							type="date"
							value={data.start_date || ''}
							onChange={e => handleChange('start_date', e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="end_date">End Date *</Label>
						<Input
							id="end_date"
							type="date"
							value={data.end_date || ''}
							onChange={e => handleChange('end_date', e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Financial Terms */}
			<div className="space-y-4">
				<h4 className="font-medium">Financial Terms</h4>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="rent_amount">Monthly Rent ($) *</Label>
						<Input
							id="rent_amount"
							type="text"
							inputMode="decimal"
							placeholder="1500.00"
							value={centsToDisplay(data.rent_amount)}
							onChange={e =>
								handleChange('rent_amount', dollarsToCents(e.target.value))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="security_deposit">Security Deposit ($) *</Label>
						<Input
							id="security_deposit"
							type="text"
							inputMode="decimal"
							placeholder="1500.00"
							value={centsToDisplay(data.security_deposit)}
							onChange={e =>
								handleChange(
									'security_deposit',
									dollarsToCents(e.target.value)
								)
							}
						/>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="payment_day">Rent Due Day *</Label>
						<Input
							id="payment_day"
							type="number"
							min="1"
							max="31"
							placeholder="1"
							value={data.payment_day || ''}
							onChange={e =>
								handleChange('payment_day', parseInt(e.target.value, 10) || 1)
							}
						/>
						<p className="text-xs text-muted-foreground">Day of month (1-31)</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="grace_period_days">Grace Period (days)</Label>
						<Input
							id="grace_period_days"
							type="number"
							min="0"
							max="30"
							placeholder="3"
							value={data.grace_period_days ?? ''}
							onChange={e =>
								handleChange(
									'grace_period_days',
									parseInt(e.target.value, 10) || 0
								)
							}
						/>
						<p className="text-xs text-muted-foreground">
							Days before late fee applies
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="late_fee_amount">Late Fee ($)</Label>
						<Input
							id="late_fee_amount"
							type="text"
							inputMode="decimal"
							placeholder="50.00"
							value={centsToDisplay(data.late_fee_amount)}
							onChange={e =>
								handleChange(
									'late_fee_amount',
									dollarsToCents(e.target.value)
								)
							}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
