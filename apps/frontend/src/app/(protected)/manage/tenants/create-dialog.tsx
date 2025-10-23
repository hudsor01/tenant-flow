'use client'

import { CreateDialog } from '@/components/ui/base-dialogs'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTenant } from '@/hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { CreateTenantInput } from '@repo/shared/types/api-inputs'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
	Mail,
	Phone,
	Plus,
	User
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const FORM_STEPS = [
	{
		id: 1,
		title: 'Basic Information',
		description: 'Name, email, and primary contact details'
	},
	{
		id: 2,
		title: 'Emergency Contact',
		description: 'Emergency contact information'
	},
	{
		id: 3,
		title: 'Additional Details',
		description: 'Optional profile details'
	}
]

export function CreateTenantDialog() {
	const [open, setOpen] = useState(false)
	const logger = createLogger({ component: 'CreateTenantDialog' })
	const createTenantMutation = useCreateTenant()

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			emergencyContact: '',
			firstName: '',
			lastName: '',
			avatarUrl: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const tenantData: CreateTenantInput = {
					name: value.name,
					email: value.email,
					phone: value.phone || null,
					emergencyContact: value.emergencyContact || null,
					firstName: value.firstName || null,
					lastName: value.lastName || null,
					avatarUrl: value.avatarUrl || null
				}

				await createTenantMutation.mutateAsync(tenantData)
				toast.success('Tenant created successfully')
				setOpen(false)
				form.reset()
			} catch (error) {
				toast.error('Failed to create tenant')
				logger.error(
					'Failed to create tenant',
					{ action: 'createTenant' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const validateStep = (step: number): boolean => {
		const values = form.state.values
		switch (step) {
			case 1: {
				if (!values.name || !values.email) {
					toast.error('Please fill in name and email')
					return false
				}
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
				if (!emailRegex.test(values.email)) {
					toast.error('Please enter a valid email address')
					return false
				}
				return true
			}
			case 2:
				return true
			case 3:
				if (values.avatarUrl) {
					try {
						new URL(values.avatarUrl)
					} catch {
						toast.error('Please enter a valid avatar URL')
						return false
					}
				}
				return true
			default:
				return true
		}
	}

	return (
		<CreateDialog
			open={open}
			onOpenChange={value => {
				setOpen(value)
				if (!value) {
					form.reset()
				}
			}}
			triggerText="Add Tenant"
			triggerIcon={<Plus className="size-4" />}
			title="Add New Tenant"
			description="Add a new tenant to your properties"
			steps={FORM_STEPS}
			formType="tenant"
			isPending={createTenantMutation.isPending}
			submitText="Create Tenant"
			submitPendingText="Creating..."
			onValidateStep={validateStep}
			onSubmit={async e => {
				e.preventDefault()
				await form.handleSubmit()
			}}
		>
			{currentStep => (
				<div className="space-y-4">
					{currentStep === 1 && (
						<>
							<form.Field name="name">
								{field => (
									<Field>
										<FieldLabel htmlFor="name">Full Name *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<User className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="name"
												placeholder="John Smith"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										<FieldError>
											{String(field.state.meta.errors?.[0] ?? '')}
										</FieldError>
									</Field>
								)}
							</form.Field>

							<form.Field name="email">
								{field => (
									<Field>
										<FieldLabel htmlFor="email">Email Address *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Mail className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="email"
												type="email"
												autoComplete="email"
												placeholder="john@propertyco.com"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										<FieldError>
											{String(field.state.meta.errors?.[0] ?? '')}
										</FieldError>
									</Field>
								)}
							</form.Field>

							<form.Field name="phone">
								{field => (
									<Field>
										<FieldLabel htmlFor="phone">Phone Number</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<Phone className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="phone"
												placeholder="+1 (555) 123-4567"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
									</Field>
								)}
							</form.Field>
						</>
					)}

					{currentStep === 2 && (
						<form.Field name="emergencyContact">
							{field => (
								<Field>
									<FieldLabel htmlFor="emergencyContact">
										Emergency Contact
									</FieldLabel>
									<Input
										id="emergencyContact"
										placeholder="Name and phone number"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
									/>
								</Field>
							)}
						</form.Field>
					)}

					{currentStep === 3 && (
						<>
							<form.Field name="firstName">
								{field => (
									<Field>
										<FieldLabel htmlFor="firstName">Preferred First Name</FieldLabel>
										<Input
											id="firstName"
											placeholder="John"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											/>
									</Field>
								)}
							</form.Field>

							<form.Field name="lastName">
								{field => (
									<Field>
										<FieldLabel htmlFor="lastName">Preferred Last Name</FieldLabel>
										<Input
											id="lastName"
											placeholder="Smith"
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											/>
									</Field>
							)}
							</form.Field>

							<form.Field name="avatarUrl">
								{field => (
									<Field>
										<FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
										<Input
											id="avatarUrl"
											placeholder="https://..."
											value={field.state.value}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												field.handleChange(e.target.value)
											}
											/>
									</Field>
							)}
							</form.Field>

							<Textarea
								placeholder="Additional notes about the tenant"
								disabled
								className="resize-none"
							/>
						</>
					)}
				</div>
			)}
		</CreateDialog>
	)
}
