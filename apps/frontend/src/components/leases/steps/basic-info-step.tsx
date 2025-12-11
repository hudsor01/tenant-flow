/**
 * Lease Generation Form - Step 1: Basic Information
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

interface BasicInfoStepProps {
	form: LeaseFormApi
}

export function BasicInfoStep({ form }: BasicInfoStepProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">
					Agreement Information
				</h3>
				<div className="space-y-4">
					<form.Field name="agreementDate">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Agreement Date *</FieldLabel>
								<Input
									type="date"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="ownerName">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Property Owner Name *</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="Property Owner LLC"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="ownerAddress">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Property Owner Address *</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="123 Main St, Austin, TX 78701"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="ownerPhone">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Property Owner Phone</FieldLabel>
								<Input
									type="tel"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="(512) 555-0100"
								/>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<div>
				<h3 className="typography-large mb-4">
					Tenant & Property
				</h3>
				<div className="space-y-4">
					<form.Field name="tenantName">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Tenant Name *</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="John Doe"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="propertyAddress">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Property Address *</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="456 Oak Ave, Austin, TX 78702"
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="commencementDate">
							{field => (
								<div className="space-y-2">
									<FieldLabel>Lease Start Date *</FieldLabel>
									<Input
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="terminationDate">
							{field => (
								<div className="space-y-2">
									<FieldLabel>Lease End Date *</FieldLabel>
									<Input
										type="date"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>
					</div>
				</div>
			</div>
		</div>
	)
}