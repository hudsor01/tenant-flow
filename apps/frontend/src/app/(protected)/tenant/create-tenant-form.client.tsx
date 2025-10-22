'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTenant } from '@/hooks/api/use-tenant'

import { createLogger } from '@repo/shared/lib/frontend-logger'

import {
	tenantCreateFormSchema
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { Mail, Phone, Plus, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'

export function CreateTenantForm() {
	const router = useRouter()
	const logger = createLogger({ component: 'CreateTenantForm' })

	// Use custom hook instead of inline mutation
	const createMutation = useCreateTenant()

	const form = useForm({
		defaultValues: {
			email: '',
			phone: '',
			emergencyContact: '',
			firstName: '',
			lastName: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const tenant = await createMutation.mutateAsync(value)
				toast.success('Tenant created successfully')
				router.push(`/manage/tenants/${tenant.id}`)
			} catch (error) {
				toast.error('Failed to create tenant', { 
					description: error instanceof Error ? error.message : 'Unknown error' 
				})
				logger.error(
					'Failed to create tenant',
					{ action: 'createTenant' },
					error
				)
			}
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantCreateFormSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="w-5 h-5" />
					Tenant Information
				</CardTitle>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-6"
				>
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
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
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
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
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
										type="tel"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder="(555) 123-4567"
									/>
								</InputGroup>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
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
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end gap-4 pt-6 border-t">
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending}
							className="flex items-center gap-2"
						>
							<Plus className="w-4 h-4" />
							{createMutation.isPending ? 'Creating...' : 'Create Tenant'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
