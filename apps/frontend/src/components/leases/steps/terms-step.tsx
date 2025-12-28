/**
 * Lease Generation Form - Step 3: Terms & Conditions
 */
import type {
	ReactFormExtendedApi,
	FormValidateOrFn,
	FormAsyncValidateOrFn
} from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { Input } from '#components/ui/input'
import { FieldLabel } from '#components/ui/field'
import { Checkbox } from '#components/ui/checkbox'
import { Textarea } from '#components/ui/textarea'

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

interface TermsStepProps {
	form: LeaseFormApi
}

export function TermsStep({ form }: TermsStepProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">Occupancy & Usage</h3>
				<div className="space-y-4">
					<form.Field name="maxOccupants">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Maximum Occupants *</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseInt(e.target.value))
									}
									min="1"
									placeholder="2"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="allowedUse">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Allowed Use</FieldLabel>
								<Textarea
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="Residential dwelling purposes only..."
									rows={3}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="propertyRules">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Property Rules</FieldLabel>
								<Textarea
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="No smoking, quiet hours 10pm-8am..."
									rows={4}
								/>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<div>
				<h3 className="typography-large mb-4">Alterations & Modifications</h3>
				<div className="space-y-4">
					<form.Field name="alterationsAllowed">
						{field => (
							<div className="flex items-center space-x-2">
								<Checkbox
									checked={field.state.value}
									onCheckedChange={checked => field.handleChange(!!checked)}
								/>
								<FieldLabel>Allow Property Alterations</FieldLabel>
							</div>
						)}
					</form.Field>

					<form.Field name="alterationsRequireConsent">
						{field => (
							<div className="flex items-center space-x-2">
								<Checkbox
									checked={field.state.value}
									onCheckedChange={checked => field.handleChange(!!checked)}
								/>
								<FieldLabel>Alterations Require Owner Consent</FieldLabel>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<div>
				<h3 className="typography-large mb-4">Pets</h3>
				<div className="space-y-4">
					<form.Field name="petsAllowed">
						{field => (
							<div className="flex items-center space-x-2">
								<Checkbox
									checked={field.state.value}
									onCheckedChange={checked => field.handleChange(!!checked)}
								/>
								<FieldLabel>Allow Pets</FieldLabel>
							</div>
						)}
					</form.Field>

					<form.Subscribe selector={state => [state.values.petsAllowed]}>
						{([petsAllowed]) => {
							if (!petsAllowed) return null

							return (
								<div className="grid grid-cols-2 gap-4 ml-6">
									<form.Field name="petDeposit">
										{field => (
											<div className="space-y-2">
												<FieldLabel>Pet Deposit</FieldLabel>
												<Input
													type="number"
													value={field.state.value}
													onChange={e =>
														field.handleChange(
															Number.parseFloat(e.target.value)
														)
													}
													placeholder="250"
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="petRent">
										{field => (
											<div className="space-y-2">
												<FieldLabel>Pet Rent (Monthly)</FieldLabel>
												<Input
													type="number"
													value={field.state.value}
													onChange={e =>
														field.handleChange(
															Number.parseFloat(e.target.value)
														)
													}
													placeholder="25"
												/>
											</div>
										)}
									</form.Field>
								</div>
							)
						}}
					</form.Subscribe>
				</div>
			</div>
		</div>
	)
}
