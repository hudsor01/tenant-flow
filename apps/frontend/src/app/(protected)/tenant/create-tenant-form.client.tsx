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
import { tenantKeys } from '@/hooks/api/use-tenant'
import { tenantsApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import {
	tenantCreateFormSchema,
	type TenantInput
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Plus, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CreateTenantForm() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'CreateTenantForm' })

	const createMutation = useMutation({
		mutationFn: (data: TenantInput) => tenantsApi.create(data),
		onSuccess: (tenant: TenantWithLeaseInfo) => {
			// Add the new tenant to the cached list without refetching
			queryClient.setQueryData(
				tenantKeys.list(),
				(old: TenantWithLeaseInfo[] | undefined) => {
					if (!Array.isArray(old)) return [tenant]
					return [tenant, ...old]
				}
			)
			queryClient.setQueryData(tenantKeys.detail(tenant.id), tenant)
			toast.success('Tenant created successfully')
			router.push(`/manage/tenants/${tenant.id}`)
		},
		onError: (error: Error) => {
			toast.error('Failed to create tenant', { description: error.message })
		}
	})

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
				await createMutation.mutateAsync(value)
			} catch (error) {
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
					return result.error.format()
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
									<FieldError errors={field.state.meta.errors} />
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
									<FieldError errors={field.state.meta.errors} />
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
								<FieldError errors={field.state.meta.errors} />
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
								<FieldError errors={field.state.meta.errors} />
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
								<FieldError errors={field.state.meta.errors} />
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
