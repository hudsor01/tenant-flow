/**
 * Lease Generation Form - Step 2: Financial Terms
 */
import type { ReactFormExtendedApi, FormValidateOrFn, FormAsyncValidateOrFn } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { Input } from '#components/ui/input'
import { FieldLabel } from '#components/ui/field'

type LeaseFormApi = ReactFormExtendedApi<
	LeaseGenerationFormData,
	FormValidateOrFn<LeaseGenerationFormData> | undefined,
	FormValidateOrFn<LeaseGenerationFormData> | undefined,
	FormAsyncValidateOrFn<LeaseGenerationFormData> | undefined,
	FormValidateOrFn<LeaseGenerationFormData> | undefined,
	FormAsyncValidateOrFn<LeaseGenerationFormData> | undefined,
	FormValidateOrFn<LeaseGenerationFormData> | undefined,
	FormAsyncValidateOrFn<LeaseGenerationFormData> | undefined,
	FormValidateOrFn<LeaseGenerationFormData> | undefined,
	FormAsyncValidateOrFn<LeaseGenerationFormData> | undefined,
	FormAsyncValidateOrFn<LeaseGenerationFormData> | undefined,
	unknown
>

interface FinancialStepProps {
	form: LeaseFormApi
}

export function FinancialStep({ form }: FinancialStepProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold mb-4">
					Rent & Deposits
				</h3>
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="rent_amount">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Monthly Rent *</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="1500"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="security_deposit">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Security Deposit</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="1500"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="rentDueDay">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Rent Due Day *</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseInt(e.target.value))
									}
									min="1"
									max="31"
									placeholder="1"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="security_depositDueDays">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Security Deposit Due (days)</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseInt(e.target.value))
									}
									placeholder="30"
								/>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<div>
				<h3 className="text-lg font-semibold mb-4">Fees & Penalties</h3>
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="late_fee_amount">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Late Fee Amount</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="50"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="lateFeeGraceDays">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Late Fee Grace Days</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseInt(e.target.value))
									}
									min="0"
									placeholder="3"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="nsfFee">
						{field => (
							<div className="space-y-2">
								<FieldLabel>NSF/Returned Check Fee</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="50"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="holdOverRentMultiplier">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Hold Over Rent Multiplier</FieldLabel>
								<Input
									type="number"
									step="0.1"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="1.2"
								/>
								<p className="text-caption">
									Rent multiplier if tenant stays after lease ends
								</p>
							</div>
						)}
					</form.Field>
				</div>
			</div>
		</div>
	)
}