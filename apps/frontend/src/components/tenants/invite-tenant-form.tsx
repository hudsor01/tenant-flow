'use client'

import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, Unit } from '@repo/shared/types/core'
import {
	inviteTenantSchema,
	type InviteTenantRequest
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Home, Mail, Phone, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ChangeEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { apiRequest } from '#lib/api-request'

const logger = createLogger({ component: 'InviteTenantForm' })

interface InviteTenantFormProps {
	properties: Property[]
	units: Unit[]
	onSuccess?: () => void
}

interface InviteTenantResponse {
	success: boolean
	tenant_id: string
	message: string
}

/**
 * Simplified Invite Tenant Form
 *
 * Collects basic tenant info + property assignment to send portal invitation.
 * Lease creation is handled separately after tenant onboards.
 *
 * Fields:
 * - Email (required) - for invitation
 * - First/Last name (required) - for tenant record
 * - Phone (optional)
 * - Property (required) - must assign to a property
 * - Unit (optional) - for multi-unit properties
 */
export function InviteTenantForm({
	properties,
	units,
	onSuccess
}: InviteTenantFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedPropertyId, setSelectedPropertyId] = useState('')

	const inviteTenantMutation = useMutation({
		mutationFn: async (payload: InviteTenantRequest) =>
			apiRequest<InviteTenantResponse>('/api/v1/tenants/invite', {
				method: 'POST',
				body: JSON.stringify(payload)
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
		}
	})

	const form = useForm({
		defaultValues: {
			email: '',
			first_name: '',
			last_name: '',
			phone: '',
			property_id: '',
			unit_id: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const payload: InviteTenantRequest = {
					tenantData: {
						email: value.email,
						first_name: value.first_name,
						last_name: value.last_name,
						...(value.phone && { phone: value.phone })
					},
					leaseData: {
						property_id: value.property_id,
						...(value.unit_id && { unit_id: value.unit_id })
					}
				}

				const response = await inviteTenantMutation.mutateAsync(payload)

				logger.info('Tenant invitation sent', {
					tenant_id: response.tenant_id
				})

				toast.success('Invitation Sent', {
					description: `${value.first_name} ${value.last_name} will receive an email to access their tenant portal.`
				})

				// Call onSuccess callback if provided
				onSuccess?.()

				router.push('/tenants')
				router.refresh()
			} catch (error) {
				logger.error('Failed to invite tenant', {
					error: error instanceof Error ? error.message : String(error)
				})

				toast.error('Failed to send invitation', {
					description:
						error instanceof Error
							? error.message
							: 'Please try again or contact support.'
				})
			}
		}
	})

	// Filter units based on selected property
	const availableUnits = units.filter(
		unit => unit.property_id === selectedPropertyId
	)

	// Auto-select the first unit if only one exists
	useEffect(() => {
		if (
			availableUnits.length === 1 &&
			!form.getFieldValue('unit_id') &&
			availableUnits[0]
		) {
			form.setFieldValue('unit_id', availableUnits[0].id)
		}
	}, [availableUnits, form])

	const handleCancel = () => {
		router.back()
	}

	return (
		<div className="space-y-6">
			{/* Tenant Information */}
			<div className="space-y-4">
				<div className="flex items-center gap-2 typography-large">
					<User className="size-5" />
					Tenant Information
				</div>

				<div className="grid grid-cols-2 gap-4">
					<form.Field
						name="first_name"
						validators={{
							onChange: inviteTenantSchema.shape.first_name
						}}
					>
						{field => (
							<Field>
								<FieldLabel htmlFor="first_name">First Name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="first_name"
										value={field.state.value}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder="John"
									/>
								</InputGroup>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<form.Field
						name="last_name"
						validators={{
							onChange: inviteTenantSchema.shape.last_name
						}}
					>
						{field => (
							<Field>
								<FieldLabel htmlFor="last_name">Last Name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="last_name"
										value={field.state.value}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder="Smith"
									/>
								</InputGroup>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field
					name="email"
					validators={{
						onChange: inviteTenantSchema.shape.email
					}}
				>
					{field => (
						<Field>
							<FieldLabel htmlFor="email">Email Address</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Mail className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="email"
									type="email"
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="john.smith@example.com"
								/>
							</InputGroup>
							<p className="text-muted">
								Tenant will receive an invitation to access their portal
							</p>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				<form.Field name="phone">
					{field => (
						<Field>
							<FieldLabel htmlFor="phone">Phone Number (Optional)</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Phone className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="phone"
									type="tel"
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="(555) 123-4567"
								/>
							</InputGroup>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>

			{/* Property Assignment */}
			<div className="space-y-4">
				<div className="flex items-center gap-2 typography-large">
					<Building2 className="size-5" />
					Property Assignment
				</div>

				<form.Field
					name="property_id"
					validators={{
						onChange: inviteTenantSchema.shape.property_id
					}}
				>
					{field => (
						<Field>
							<FieldLabel htmlFor="property_id">Property</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={value => {
									field.handleChange(value)
									setSelectedPropertyId(value)
									// Reset unit selection when property changes
									form.setFieldValue('unit_id', '')
								}}
							>
								<SelectTrigger id="property_id">
									<SelectValue placeholder="Select a property" />
								</SelectTrigger>
								<SelectContent>
									{properties.map(property => (
										<SelectItem key={property.id} value={property.id}>
											<div className="flex items-center gap-2">
												<Home className="size-4" />
												{property.name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				{/* Only show unit field if property has multiple units */}
				{selectedPropertyId && availableUnits.length > 1 && (
					<form.Field name="unit_id">
						{field => (
							<Field>
								<FieldLabel htmlFor="unit_id">Unit (Optional)</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
								>
									<SelectTrigger id="unit_id">
										<SelectValue placeholder="Select a unit" />
									</SelectTrigger>
									<SelectContent>
										{availableUnits.map(unit => (
											<SelectItem key={unit.id} value={unit.id}>
												{unit.unit_number}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				)}

				{/* Show message for single-family homes */}
				{selectedPropertyId && availableUnits.length <= 1 && (
					<p className="text-muted">
						{availableUnits.length === 0
							? 'This property has no units configured.'
							: 'Single-unit property - unit will be assigned automatically.'}
					</p>
				)}
			</div>

			{/* Form Actions */}
			<div className="flex justify-end gap-4 pt-4 border-t">
				<Button type="button" variant="outline" onClick={handleCancel}>
					Cancel
				</Button>
				<form.Subscribe
					selector={state => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button
							type="submit"
							disabled={
								!canSubmit || inviteTenantMutation.isPending || isFormSubmitting
							}
							onClick={form.handleSubmit}
						>
							<Mail className="size-4 mr-2" />
							{inviteTenantMutation.isPending || isFormSubmitting
								? 'Sending Invitation...'
								: 'Send Invitation'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
