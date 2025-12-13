'use client'

/**
 * Lease Creation Wizard - Step 2: Terms
 * Dates and financial details
 *
 * Note: Validation is handled by Zod schemas in @repo/shared/validation/lease-wizard.schemas.ts
 * This component only handles display/input - uses type="text" with inputMode for mobile keyboards
 */
import { Field, FieldLabel, FieldDescription, FieldGroup } from '#components/ui/field'
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

	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">Lease Terms</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Set the lease duration and financial terms.
				</p>
			</div>

			{/* Dates */}
			<FieldGroup>
				<h4 className="font-medium">Lease Duration</h4>
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="start_date">Start Date *</FieldLabel>
						<Input
							id="start_date"
							type="date"
							value={data.start_date}
							onChange={e => handleChange('start_date', e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="end_date">End Date *</FieldLabel>
						<Input
							id="end_date"
							type="date"
							value={data.end_date}
							onChange={e => handleChange('end_date', e.target.value)}
						/>
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
							onChange={e => handleChange('rent_amount', parseCents(e.target.value))}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="security_deposit">Security Deposit ($)</FieldLabel>
						<Input
							id="security_deposit"
							type="text"
							inputMode="decimal"
							placeholder="1500.00"
							value={centsToDisplay(data.security_deposit)}
							onChange={e => handleChange('security_deposit', parseCents(e.target.value))}
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
							onChange={e => handleChange('payment_day', parseInteger(e.target.value))}
						/>
						<FieldDescription>Day rent is due (1-31)</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="grace_period_days">Grace Period (days)</FieldLabel>
						<Input
							id="grace_period_days"
							type="text"
							inputMode="numeric"
							placeholder="3"
							value={data.grace_period_days ?? ''}
							onChange={e => handleChange('grace_period_days', parseInteger(e.target.value))}
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
							onChange={e => handleChange('late_fee_amount', parseCents(e.target.value))}
						/>
						<FieldDescription>Optional, defaults to $0</FieldDescription>
					</Field>
				</div>
			</FieldGroup>
		</div>
	)
}
