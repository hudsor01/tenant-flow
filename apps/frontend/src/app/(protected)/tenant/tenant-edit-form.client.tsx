'use client'

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { useTenant, useUpdateTenant } from '@/hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	tenantUpdateSchema
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { Mail, Phone, Save, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'

export interface TenantEditFormProps {
	id: string
}

export function TenantEditForm({ id }: TenantEditFormProps) {
	// ...existing code...
	const { data: tenant, isLoading, isError } = useTenant(id)
	const logger = createLogger({ component: 'TenantEditForm' })
	const router = useRouter()

	// Use custom hook instead of inline mutation
	const updateMutation = useUpdateTenant()

	const form = useForm({
		defaultValues: {
			email: tenant?.email || '',
			phone: tenant?.phone || '',
			emergencyContact: tenant?.emergencyContact || '',
			firstName: tenant?.name?.split(' ')[0] || '',
			lastName: tenant?.name?.split(' ').slice(1).join(' ') || ''
		},
		onSubmit: async ({ value }) => {
			try {
				await updateMutation.mutateAsync({ id, data: value })
				toast.success('Tenant updated successfully')
				router.push(`/manage/tenants/${id}`)
			} catch (error) {
				toast.error('Failed to update tenant', { 
					description: error instanceof Error ? error.message : 'Unknown error' 
				})
				logger.error(
					'Failed to update tenant',
					{ action: 'updateTenant' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantUpdateSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		form.handleSubmit()
	}

	const footer = (
		<div className="flex justify-end gap-4 pt-6 border-t">
			<Button type="button" variant="outline" onClick={() => router.back()}>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={updateMutation.isPending}
				className="flex items-center gap-2"
			>
				<Save className="w-4 h-4" />
				{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	)

	return (
		<CardLayout
			title="Edit Tenant Information"
			description="Update tenant contact details and emergency contact information"
			isLoading={isLoading}
			error={isError ? 'Failed to load tenant data' : null}
			footer={footer}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="firstName">
						{field => (
							<Field>
								<FieldLabel htmlFor="firstName">First Name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User className="w-4 h-4" />
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
								{field.state.meta.errors?.length && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					<form.Field name="lastName">
						{field => (
							<Field>
								<FieldLabel htmlFor="lastName">Last Name</FieldLabel>
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<User className="w-4 h-4" />
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
								{field.state.meta.errors?.length && (
									<FieldError>{String(field.state.meta.errors[0])}</FieldError>
								)}
							</Field>
						)}
					</form.Field>
				</div>

				<form.Field name="email">
					{field => (
						<Field>
							<FieldLabel htmlFor="email">Email Address</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<Mail className="w-4 h-4" />
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
							{field.state.meta.errors?.length && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
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
									type="tel"
									value={field.state.value}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="(555) 123-4567"
								/>
							</InputGroup>
							{field.state.meta.errors?.length && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
						</Field>
					)}
				</form.Field>

				<form.Field name="emergencyContact">
					{field => (
						<Field>
							<FieldLabel htmlFor="emergencyContact">
								Emergency Contact
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
							{field.state.meta.errors?.length && (
								<FieldError>{String(field.state.meta.errors[0])}</FieldError>
							)}
						</Field>
					)}
				</form.Field>
			</form>
		</CardLayout>
	)
}
