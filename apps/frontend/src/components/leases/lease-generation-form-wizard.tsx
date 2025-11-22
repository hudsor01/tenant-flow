'use client'

import { useForm } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { Input } from '#components/ui/input'
import { FieldLabel } from '#components/ui/field'
import { Checkbox } from '#components/ui/checkbox'
import {
	useGenerateLease,
	useLeaseAutoFill
} from '#hooks/api/use-lease-generation'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { logger } from '@repo/shared/lib/frontend-logger'
import { LeaseWizard } from './lease-wizard'
import { Textarea } from '#components/ui/textarea'

interface LeaseGenerationFormWizardProps {
	property_id: string
	unit_id: string
	tenant_id: string
	onSuccess?: () => void
}

/**
 * Texas Residential Lease Agreement Generation Form - Wizard Version
 * 4-step guided process to reduce information overload
 */
export function LeaseGenerationFormWizard({
	property_id,
	unit_id,
	tenant_id,
	onSuccess
}: LeaseGenerationFormWizardProps) {
	const { data: autoFillData, isLoading: isAutoFilling } = useLeaseAutoFill(
		property_id,
		unit_id,
		tenant_id
	)
	const generateLease = useGenerateLease()

	const form = useForm({
		defaultValues: {
			agreementDate: new Date().toISOString().split('T')[0],
			ownerName: '',
			ownerAddress: '',
			ownerPhone: '',
			tenantName: '',
			propertyAddress: '',
			commencementDate: '',
			terminationDate: '',
			rent_amount: 0,
			rentDueDay: 1,
			late_fee_amount: 0,
			lateFeeGraceDays: 3,
			nsfFee: 50,
			security_deposit: 0,
			security_depositDueDays: 30,
			maxOccupants: 2,
			allowedUse:
				'Residential dwelling purposes only. No business activities.',
			alterationsAllowed: false,
			alterationsRequireConsent: true,
			utilitiesIncluded: [] as string[],
			tenantResponsibleUtilities: [
				'Electric',
				'Gas',
				'Water',
				'Internet'
			] as string[],
			propertyRules: '',
			holdOverRentMultiplier: 1.2,
			petsAllowed: false,
			petDeposit: 0,
			petRent: 0,
			prevailingPartyAttorneyFees: true,
			governingState: 'TX',
			noticeAddress: '',
			noticeEmail: '',
			propertyBuiltBefore1978: false,
			leadPaintDisclosureProvided: false,
			property_id,
			tenant_id
		} as LeaseGenerationFormData,
		onSubmit: async ({ value }) => {
			try {
				await generateLease.mutateAsync(value)
				onSuccess?.()
			} catch (error) {
				logger.error('Form submission failed', {
					action: 'lease_form_submit_error',
					metadata: { error: String(error) }
				})
			}
		}
	})

	// Auto-fill form when data is loaded
	const hasAutoFilledRef = useRef(false)

	useEffect(() => {
		if (autoFillData && !hasAutoFilledRef.current) {
			hasAutoFilledRef.current = true
			Object.entries(autoFillData).forEach(([key, value]) => {
				if (value !== undefined) {
					try {
						const fieldInfo = form.getFieldInfo(key as keyof LeaseGenerationFormData)
						if (fieldInfo?.instance) {
							fieldInfo.instance.setValue(value)
						}
					} catch (error) {
						logger.warn(`Failed to auto-fill field ${key}`, {
							action: 'lease_form_autofill_field_error',
							metadata: { field: key, error: String(error) }
						})
					}
				}
			})
		}
	}, [autoFillData, form])

	if (isAutoFilling) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	const handleSubmit = () => {
		form.handleSubmit()
	}

	return (
		<LeaseWizard
			property_id={property_id}
			unit_id={unit_id}
			tenant_id={tenant_id}
			onSubmit={handleSubmit}
			isSubmitting={generateLease.isPending}
		>
			{({ currentStep, setCanGoNext }) => {
				// Validate current step based on form values
				const values = form.state.values
				let isValid = false

				switch (currentStep) {
					case 0: // Basic Info
						isValid = !!(
							values.agreementDate &&
							values.ownerName &&
							values.ownerAddress &&
							values.tenantName &&
							values.propertyAddress &&
							values.commencementDate &&
							values.terminationDate
						)
						break
					case 1: // Financial
						isValid = !!(
							values.rent_amount > 0 &&
							values.rentDueDay >= 1 &&
							values.rentDueDay <= 31
						)
						break
					case 2: // Terms
						isValid = !!(values.maxOccupants && values.maxOccupants > 0)
						break
					case 3: // Review
						isValid = true
						break
				}

				// Update wizard navigation state (only once per render)
				setCanGoNext(isValid)

				return (
					<>
						{/* Step 1: Basic Information */}
						{currentStep === 0 && (
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-4">
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
									<h3 className="text-lg font-semibold mb-4">
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
						)}

						{/* Step 2: Financial Terms */}
						{currentStep === 1 && (
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
													<p className="text-xs text-muted-foreground">
														Rent multiplier if tenant stays after lease ends
													</p>
												</div>
											)}
										</form.Field>
									</div>
								</div>
							</div>
						)}

						{/* Step 3: Terms & Conditions */}
						{currentStep === 2 && (
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-4">
										Occupancy & Usage
									</h3>
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
									<h3 className="text-lg font-semibold mb-4">
										Alterations & Modifications
									</h3>
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
									<h3 className="text-lg font-semibold mb-4">Pets</h3>
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
						)}

						{/* Step 4: Review & Legal */}
						{currentStep === 3 && (
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-4">
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
											{field => (
												<div className="flex items-center space-x-2">
													<Checkbox
														checked={field.state.value}
														onCheckedChange={checked => field.handleChange(!!checked)}
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
									<h3 className="text-lg font-semibold mb-4">
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
									<h3 className="text-lg font-semibold mb-4">Lease Summary</h3>
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
						)}
					</>
				)
			}}
		</LeaseWizard>
	)
}
