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
import type { Tables } from '@repo/shared/types/supabase'
import { useForm } from '@tanstack/react-form'
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

type Property = Tables<'property'>
type Unit = Tables<'unit'>

const logger = createLogger({ component: 'CreateTenantForm' })

// Validation schema - Note: unitId validation is conditional based on available units
const inviteTenantSchema = {
	// Tenant information
	email: z.string().email('Invalid email address'),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	phone: z.string().optional(),
	emergencyContact: z.string().optional(),

	// Lease information
	propertyId: z.string().min(1, 'Property is required'),
	unitId: z.string().optional(), // Made optional - will be validated conditionally
	rentAmount: z.string().refine(
		val => {
			const num = Number.parseFloat(val)
			return !Number.isNaN(num) && num > 0
		},
		{ message: 'Rent amount must be greater than 0' }
	),
	securityDeposit: z.string().refine(
		val => {
			const num = Number.parseFloat(val)
			return !Number.isNaN(num) && num >= 0
		},
		{ message: 'Security deposit cannot be negative' }
	),
	startDate: z.string().min(1, 'Start date is required'),
	endDate: z.string().min(1, 'End date is required')
}

interface CreateTenantFormProps {
	properties: Property[]
	units: Unit[]
}

import { clientFetch } from '#lib/api/client'

export function CreateTenantForm({ properties, units }: CreateTenantFormProps) {
	const router = useRouter()
	const [selectedPropertyId, setSelectedPropertyId] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const form = useForm({
		defaultValues: {
			email: '',
			phone: '',
			emergencyContact: '',
			firstName: '',
			lastName: '',
			propertyId: '',
			unitId: '',
			rentAmount: '',
			securityDeposit: '',
			startDate: '',
			endDate: ''
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			try {
				const response = await clientFetch<{
					success: boolean
					tenantId: string
					leaseId: string
					checkoutUrl: string
					message: string
				}>('/api/v1/tenants/invite-with-lease', {
					method: 'POST',
					body: JSON.stringify({
						tenantData: {
							email: value.email,
							firstName: value.firstName,
							lastName: value.lastName,
							...(value.phone && { phone: value.phone })
						},
						leaseData: {
							propertyId: value.propertyId,
							...(value.unitId && { unitId: value.unitId }),
							rentAmount: Math.round(Number.parseFloat(value.rentAmount) * 100),
							securityDeposit: Math.round(
								Number.parseFloat(value.securityDeposit) * 100
							),
							startDate: value.startDate,
							endDate: value.endDate
						}
					})
				})


				logger.info('Tenant onboarded successfully', {
					tenantId: response.tenantId,
					leaseId: response.leaseId,
					checkoutUrl: response.checkoutUrl
				})

				toast.success('Tenant Invited Successfully', {
					description: response.message
				})

				router.push(`/manage/tenants/${response.tenantId}`)
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
			} finally {
				setIsSubmitting(false)
			}
		}
	})

	// Filter units based on selected property
	const availableUnits = units.filter(
		unit => unit.propertyId === selectedPropertyId
	)

	// Auto-select the first unit if only one exists
	useEffect(() => {
		if (
			availableUnits.length === 1 &&
			!form.getFieldValue('unitId') &&
			availableUnits[0]
		) {
			form.setFieldValue('unitId', availableUnits[0].id)
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
							name="firstName"
							validators={{
								onChange: inviteTenantSchema.firstName
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="firstName">First Name</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<User className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="firstName"
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
							name="lastName"
							validators={{
								onChange: inviteTenantSchema.lastName
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="lastName">Last Name</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<User className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="lastName"
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

					<form.Field name="emergencyContact">
						{field => (
							<Field>
								<FieldLabel htmlFor="emergencyContact">
									Emergency Contact (Optional)
								</FieldLabel>
								<Textarea
									id="emergencyContact"
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
						name="propertyId"
						validators={{
							onChange: inviteTenantSchema.propertyId
						}}
					>
						{field => (
							<Field>
								<FieldLabel htmlFor="propertyId">Property</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={value => {
										field.handleChange(value)
										setSelectedPropertyId(value)
										// Reset unit selection when property changes
										form.setFieldValue('unitId', '')
									}}
								>
									<SelectTrigger id="propertyId">
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
						name="unitId"
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
								<FieldLabel htmlFor="unitId">
									Unit{' '}
									{availableUnits.length > 0
										? ''
										: '(Optional - No units configured)'}
								</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={!selectedPropertyId || availableUnits.length === 0}
								>
									<SelectTrigger id="unitId">
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
												{unit.unitNumber}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									{!selectedPropertyId
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
							name="rentAmount"
							validators={{
								onChange: inviteTenantSchema.rentAmount
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="rentAmount">Monthly Rent</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<DollarSign className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="rentAmount"
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
							name="securityDeposit"
							validators={{
								onChange: inviteTenantSchema.securityDeposit
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="securityDeposit">
										Security Deposit
									</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<DollarSign className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="securityDeposit"
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
							name="startDate"
							validators={{
								onChange: inviteTenantSchema.startDate
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="startDate">Lease Start Date</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Calendar className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="startDate"
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
							name="endDate"
							validators={{
								onChange: inviteTenantSchema.endDate
							}}
						>
							{field => (
								<Field>
									<FieldLabel htmlFor="endDate">Lease End Date</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Calendar className="size-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="endDate"
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
							disabled={!canSubmit || isSubmitting || isFormSubmitting}
							onClick={form.handleSubmit}
						>
							{isSubmitting || isFormSubmitting
								? 'Creating Tenant...'
								: 'Create & Invite Tenant'}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	)
}
