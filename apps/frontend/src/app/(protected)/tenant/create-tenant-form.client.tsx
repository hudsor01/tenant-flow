'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
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
import { Textarea } from '#components/ui/textarea'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, Unit } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Building2,
	Calendar,
	DollarSign,
	Home,
	Mail,
	Phone,
	User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useModalStore } from '#stores/modal-store'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { clientFetch } from '#lib/api/client'

const logger = createLogger({ component: 'CreateTenantForm' })

// Validation schema - Note: unit_id validation is conditional based on available units
const inviteTenantSchema = {
	// Tenant information
	email: z.string().email('Invalid email address'),
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	phone: z.string().optional(),
	emergency_contact: z.string().optional(),

	// Lease information
	property_id: z.string().min(1, 'Property is required'),
	unit_id: z.string().optional(), // Made optional - will be validated conditionally
	rent_amount: z.string().refine(
		val => {
			const num = Number.parseFloat(val)
			return !Number.isNaN(num) && num > 0
		},
		{ message: 'Rent amount must be greater than 0' }
	),
	security_deposit: z.string().refine(
		val => {
			const num = Number.parseFloat(val)
			return !Number.isNaN(num) && num >= 0
		},
		{ message: 'Security deposit cannot be negative' }
	),
	start_date: z.string().min(1, 'Start date is required'),
	end_date: z.string().min(1, 'End date is required')
}

interface CreateTenantFormProps {
	properties: Property[]
	units: Unit[]
	modalId?: string
}

interface InviteTenantRequest {
	tenantData: {
		email: string
		first_name: string
		last_name: string
		phone?: string
	}
	leaseData: {
		property_id: string
		unit_id?: string
		rent_amount: number
		security_deposit: number
		start_date: string
		end_date: string
	}
}

interface InviteTenantResponse {
	success: boolean
	tenant_id: string
	lease_id: string
	checkoutUrl: string
	message: string
}

export function CreateTenantForm({
	properties,
	units,
	modalId
}: CreateTenantFormProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedproperty_id, setSelectedproperty_id] = useState('')
	const { trackMutation, closeOnMutationSuccess } = useModalStore()

	const inviteTenantMutation = useMutation({
		mutationFn: (payload: InviteTenantRequest) =>
			clientFetch<InviteTenantResponse>('/api/v1/tenants/invite-with-lease', {
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
			phone: '',
			emergency_contact: '',
			first_name: '',
			last_name: '',
			property_id: '',
			unit_id: '',
			rent_amount: '',
			security_deposit: '',
			start_date: '',
			end_date: ''
		},
		onSubmit: async ({ value }) => {
			try {
				// Track mutation for auto-close if in modal
				if (modalId) {
					trackMutation(modalId, 'create-tenant', queryClient)
				}

				// Validate numeric conversions
				const rent_amount = Number.parseFloat(value.rent_amount)
				const security_deposit = Number.parseFloat(value.security_deposit)
				if (Number.isNaN(rent_amount) || Number.isNaN(security_deposit)) {
					toast.error('Invalid rent or security deposit amount')
					return
				}

				const payload: InviteTenantRequest = {
					tenantData: {
						email: value.email,
						first_name: value.first_name,
						last_name: value.last_name,
						...(value.phone && { phone: value.phone })
					},
					leaseData: {
						property_id: value.property_id,
						...(value.unit_id && { unit_id: value.unit_id }),
						rent_amount: Math.round(rent_amount * 100),
						security_deposit: Math.round(security_deposit * 100),
						start_date: value.start_date,
						end_date: value.end_date
					}
				}

				const response = await inviteTenantMutation.mutateAsync(payload)

				logger.info('Tenant onboarded successfully', {
					tenant_id: response.tenant_id,
					lease_id: response.lease_id,
					checkoutUrl: response.checkoutUrl
				})

				toast.success('Tenant Invited Successfully', {
					description: response.message
				})

				// Close modal on success if tracked
				if (modalId) {
					closeOnMutationSuccess('create-tenant')
				}

				router.push(`/manage/tenants/${response.tenant_id}`)
			} catch (error) {
				logger.error('Failed to onboard tenant', {
					error: error instanceof Error ? error.message : String(error)
				})

				toast.error('Failed to create tenant', {
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
		unit => unit.property_id === selectedproperty_id
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

	return (
		<div className="space-y-6">
			{/* Tenant Information Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="size-5" />
						Tenant Information
					</CardTitle>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="grid grid-cols-2 gap-4">
						<form.Field
							name="first_name"
							validators={{
								onChange: inviteTenantSchema.first_name
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
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
								onChange: inviteTenantSchema.last_name
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
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
							onChange: inviteTenantSchema.email
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
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder="john.smith@example.com"
									/>
								</InputGroup>
								<p className="text-sm text-muted-foreground">
									Tenant will receive an invitation email to access their portal
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
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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

					<form.Field name="emergency_contact">
						{field => (
							<Field>
								<FieldLabel htmlFor="emergency_contact">
									Emergency Contact (Optional)
								</FieldLabel>
								<Textarea
									id="emergency_contact"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="Emergency contact name, relationship, and phone number..."
									rows={4}
								/>
								<p className="text-sm text-muted-foreground">
									Include name, relationship, and contact information
								</p>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>
				</CardContent>
			</Card>

			{/* Lease Information Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="size-5" />
						Lease Assignment
					</CardTitle>
				</CardHeader>

				<CardContent className="space-y-6">
					<form.Field
						name="property_id"
						validators={{
							onChange: inviteTenantSchema.property_id
						}}
					>
						{field => (
							<Field>
								<FieldLabel htmlFor="property_id">Property</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={value => {
										field.handleChange(value)
										setSelectedproperty_id(value)
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

					<form.Field
						name="unit_id"
						validators={{
							onChange: ({ value }) => {
								// Only require unit if there are available units
								if (availableUnits.length > 0 && !value) {
									return 'Unit is required when units are available'
								}
								return undefined
							}
						}}
					>
						{field => (
							<Field>
								<FieldLabel htmlFor="unit_id">
									Unit{' '}
									{availableUnits.length > 0
										? ''
										: '(Optional - No units configured)'}
								</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={!selectedproperty_id || availableUnits.length === 0}
								>
									<SelectTrigger id="unit_id">
										<SelectValue
											placeholder={
												availableUnits.length === 0
													? 'No units available'
													: 'Select a unit'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{availableUnits.map(unit => (
											<SelectItem key={unit.id} value={unit.id}>
												{unit.unit_number}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									{!selectedproperty_id
										? 'Select a property first'
										: availableUnits.length === 0
											? 'This property has no units configured. The lease will be created without a specific unit.'
											: availableUnits.length === 1
												? 'Single unit automatically selected'
												: null}
								</p>
								<FieldError errors={field.state.meta.errors} />
							</Field>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field
							name="rent_amount"
							validators={{
								onChange: inviteTenantSchema.rent_amount
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="rent_amount">Monthly Rent</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<DollarSign className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="rent_amount"
											type="number"
											step="0.01"
											min="0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
											placeholder="1500.00"
										/>
									</InputGroup>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field
							name="security_deposit"
							validators={{
								onChange: inviteTenantSchema.security_deposit
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="security_deposit">
										Security Deposit
									</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<DollarSign className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="security_deposit"
											type="number"
											step="0.01"
											min="0"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
											placeholder="3000.00"
										/>
									</InputGroup>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field
							name="start_date"
							validators={{
								onChange: inviteTenantSchema.start_date
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="start_date">Lease Start Date</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Calendar className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="start_date"
											type="date"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</InputGroup>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field
							name="end_date"
							validators={{
								onChange: inviteTenantSchema.end_date
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="end_date">Lease End Date</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Calendar className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="end_date"
											type="date"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
										/>
									</InputGroup>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					</div>
				</CardContent>
			</Card>

			{/* Form Actions */}
			<div className="flex justify-end gap-4">
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
				<form.Subscribe
					selector={state => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button
							type="submit"
							disabled={
								!canSubmit ||
								inviteTenantMutation.isPending ||
								isFormSubmitting
							}
							onClick={form.handleSubmit}
						>
							{inviteTenantMutation.isPending || isFormSubmitting
								? 'Creating Tenant...'
								: 'Create & Invite Tenant'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
