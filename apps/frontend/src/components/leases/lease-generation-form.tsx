'use client'

import { useForm } from '@tanstack/react-form'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { FieldLabel } from '#components/ui/field'
import { Checkbox } from '#components/ui/checkbox'
import {
	useGenerateLease,
	useLeaseAutoFill
} from '#hooks/api/use-lease-generation'
import { useCallback, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { logger } from '@repo/shared/lib/frontend-logger'

interface LeaseGenerationFormProps {
	propertyId: string
	unitId: string
	tenantId: string
	onSuccess?: () => void
}

/**
 * Texas Residential Lease Agreement Generation Form
 * Replaces puppeteer with pdf-lib (450KB bundle reduction)
 * REQUIRES property, unit, and tenant - cannot generate lease without all three
 */
export function LeaseGenerationForm({
	propertyId,
	unitId,
	tenantId,
	onSuccess
}: LeaseGenerationFormProps) {
	// CRITICAL: All hooks must be called before any conditional returns (Rules of Hooks)
	const { data: autoFillData, isLoading: isAutoFilling } = useLeaseAutoFill(
		propertyId,
		unitId,
		tenantId
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
			monthlyRent: 0,
			rentDueDay: 1,
			lateFeeAmount: 0,
			lateFeeGraceDays: 3,
			nsfFee: 50,
			securityDeposit: 0,
			securityDepositDueDays: 30,
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
			propertyId,
			tenantId
		} as LeaseGenerationFormData,
		onSubmit: async ({ value }) => {
			try {
				await generateLease.mutateAsync(value)
				onSuccess?.()
			} catch (error) {
				// Error already handled by useMutation onError callback
				logger.error('Form submission failed', {
					action: 'lease_form_submit_error',
					metadata: { error: String(error) }
				})
			}
		}
	})

// Auto-fill form when data is loaded
	const hasAutoFilledRef = useRef(false)

	const autoFillForm = useCallback(() => {
		if (autoFillData && !hasAutoFilledRef.current) {
			hasAutoFilledRef.current = true
			Object.entries(autoFillData).forEach(([key, value]) => {
				if (value !== undefined) {
					try {
						// Type-safe field update without 'as any'
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

	useEffect(() => {
		autoFillForm()
	}, [autoFillForm])

	// Show error if required data is missing (after all hooks)
	if (!propertyId || !unitId || !tenantId) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center space-y-2">
					<p className="text-destructive font-semibold">
						Missing Required Information
					</p>
					<p className="text-sm text-muted-foreground">
						Property, unit, and tenant must all be selected to generate a lease agreement.
					</p>
				</div>
			</div>
		)
	}

	if (isAutoFilling) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
			className="space-y-6"
		>
			{/* Agreement Date & Parties */}
			<div className="space-y-4">
				<h3 className="font-semibold">Agreement Information</h3>

				<form.Field name="agreementDate">
					{field => (
						<div className="space-y-2">
							<FieldLabel>Agreement Date</FieldLabel>
							<Input
								type="date"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="ownerName">
					{field => (
						<div className="space-y-2">
							<FieldLabel>Property Owner Name</FieldLabel>
							<Input
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="Property Owner LLC"
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="ownerAddress">
					{field => (
						<div className="space-y-2">
							<FieldLabel>Property Owner Address</FieldLabel>
							<Input
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="123 Main St, Austin, TX 78701"
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="tenantName">
					{field => (
						<div className="space-y-2">
							<FieldLabel>Tenant Name</FieldLabel>
							<Input
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="John Doe"
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="propertyAddress">
					{field => (
						<div className="space-y-2">
							<FieldLabel>Property Address</FieldLabel>
							<Input
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="456 Oak Ave, Austin, TX 78702"
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>

			{/* Lease Term */}
			<div className="space-y-4">
				<h3 className="font-semibold">Lease Term</h3>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="commencementDate">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Start Date</FieldLabel>
								<Input
									type="date"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-sm text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="terminationDate">
						{field => (
							<div className="space-y-2">
								<FieldLabel>End Date</FieldLabel>
								<Input
									type="date"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-sm text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>
				</div>
			</div>

			{/* Financial Terms */}
			<div className="space-y-4">
				<h3 className="font-semibold">Financial Terms</h3>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="monthlyRent">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Monthly Rent</FieldLabel>
								<Input
									type="number"
									value={field.state.value}
									onChange={e =>
										field.handleChange(Number.parseFloat(e.target.value))
									}
									placeholder="1500"
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-sm text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="securityDeposit">
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
								{field.state.meta.errors.length > 0 && (
									<p className="text-sm text-destructive">
										{field.state.meta.errors[0]}
									</p>
								)}
							</div>
						)}
					</form.Field>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="rentDueDay">
						{field => (
							<div className="space-y-2">
								<FieldLabel>Rent Due Day</FieldLabel>
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
				</div>
			</div>

			{/* Pets */}
			<div className="space-y-4">
				<h3 className="font-semibold">Pets</h3>

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

				<form.Subscribe
					selector={state => [state.values.petsAllowed]}
				>
					{([petsAllowed]) => {
						if (!petsAllowed) return null

						return (
							<div className="grid grid-cols-2 gap-4">
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

			{/* Actions */}
			<div className="flex justify-end gap-4 pt-4 border-t">
				<Button
					type="submit"
					disabled={generateLease.isPending || !form.state.isValid}
				>
					{generateLease.isPending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Generating...
						</>
					) : (
						'Generate & Download Lease'
					)}
				</Button>
			</div>
		</form>
	)
}
