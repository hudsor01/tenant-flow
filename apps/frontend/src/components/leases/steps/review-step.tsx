/**
 * Lease Generation Form - Step 4: Review & Legal
 */
import type { ReactFormExtendedApi, FormValidateOrFn, FormAsyncValidateOrFn } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { Input } from '#components/ui/input'
import { FieldLabel } from '#components/ui/field'
import { Checkbox } from '#components/ui/checkbox'

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

interface ReviewStepProps {
	form: LeaseFormApi
}

export function ReviewStep({ form }: ReviewStepProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">
					Legal Requirements
				</h3>
				<div className="space-y-4">
					<form.Field name="governingState">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Governing State</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="TX"
									maxLength={2}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="noticeAddress">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Notice Address</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="Address for legal notices"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="noticeEmail">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Notice Email</FieldLabel>
								<Input
									type="email"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									placeholder="notices@example.com"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="prevailingPartyAttorneyFees">
						{Field => (
							<div className="flex items-center space-x-2">
								<Checkbox
									checked={Field.state.value}
									onCheckedChange={checked => Field.handleChange(!!checked)}
								/>
								<FieldLabel>
									Prevailing Party Recovers Attorney Fees
								</FieldLabel>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<div>
				<h3 className="typography-large mb-4">
					Lead Paint Disclosure
				</h3>
				<div className="space-y-4">
					<form.Field name="propertyBuiltBefore1978">
						{field => (
							<div className="flex items-center space-x-2">
								<Checkbox
									checked={field.state.value}
									onCheckedChange={checked => field.handleChange(!!checked)}
								/>
								<FieldLabel>Property Built Before 1978</FieldLabel>
							</div>
						)}
					</form.Field>

					<form.Subscribe
						selector={state => [state.values.propertyBuiltBefore1978]}
					>
						{([propertyBuiltBefore1978]) => {
							if (!propertyBuiltBefore1978) return null

							return (
								<div className="ml-6">
									<form.Field name="leadPaintDisclosureProvided">
										{field => (
											<div className="flex items-center space-x-2">
												<Checkbox
													checked={field.state.value ?? false}
													onCheckedChange={checked =>
														field.handleChange(!!checked)
													}
												/>
												<FieldLabel>
													Lead Paint Disclosure Provided
												</FieldLabel>
											</div>
										)}
									</form.Field>
								</div>
							)
						}}
					</form.Subscribe>
				</div>
			</div>

			{/* Review Summary */}
			<div className="rounded-lg border bg-muted/50 p-6">
				<h3 className="typography-large mb-4">Lease Summary</h3>
				<form.Subscribe
					selector={state => ({
						ownerName: state.values.ownerName,
						tenantName: state.values.tenantName,
						propertyAddress: state.values.propertyAddress,
						commencementDate: state.values.commencementDate,
						terminationDate: state.values.terminationDate,
						rent_amount: state.values.rent_amount,
						security_deposit: state.values.security_deposit,
						petsAllowed: state.values.petsAllowed
					})}
				>
					{({
						ownerName,
						tenantName,
						propertyAddress,
						commencementDate,
						terminationDate,
						rent_amount,
						security_deposit,
						petsAllowed
					}) => (
						<dl className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<dt className="font-medium text-muted-foreground">
									Property Owner
								</dt>
								<dd className="mt-1">{ownerName || '-'}</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">
									Tenant
								</dt>
								<dd className="mt-1">{tenantName || '-'}</dd>
							</div>
							<div className="col-span-2">
								<dt className="font-medium text-muted-foreground">
									Property Address
								</dt>
								<dd className="mt-1">{propertyAddress || '-'}</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">
									Lease Term
								</dt>
								<dd className="mt-1">
									{commencementDate && terminationDate
										? `${new Date(commencementDate).toLocaleDateString()} - ${new Date(terminationDate).toLocaleDateString()}`
										: '-'}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">
									Monthly Rent
								</dt>
								<dd className="mt-1">
									${(rent_amount / 100).toLocaleString('en-US', {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									})}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">
									Security Deposit
								</dt>
								<dd className="mt-1">
									$
									{(security_deposit / 100).toLocaleString('en-US', {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2
									})}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">
									Pets Allowed
								</dt>
								<dd className="mt-1">{petsAllowed ? 'Yes' : 'No'}</dd>
							</div>
						</dl>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}