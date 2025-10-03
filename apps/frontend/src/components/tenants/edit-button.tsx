'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import { tenantsApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import {
	tenantUpdateSchema,
	type TenantUpdate
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Calendar,
	CreditCard,
	Edit,
	Eye,
	Mail,
	MapPin,
	Phone,
	Trash2,
	User
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

export function TenantEditViewButtons({ tenant }: TenantActionButtonsProps) {
	const [viewOpen, setViewOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'TenantEditViewButtons' })

	const form = useForm({
		defaultValues: {
			email: tenant.email || '',
			phone: tenant.phone || '',
			emergencyContact: tenant.emergencyContact || '',
			firstName: tenant.name?.split(' ')[0] || '',
			lastName: tenant.name?.split(' ').slice(1).join(' ') || ''
		},
		onSubmit: async ({ value }) => {
			updateMutation.mutate(value)
		},
		validators: {
			onChange: ({ value }) => {
				const result = tenantUpdateSchema.safeParse(value)
				if (!result.success) {
					return result.error.format()
				}
				return undefined
			}
		}
	})

	const updateMutation = useMutation({
		mutationFn: (data: TenantUpdate) => tenantsApi.update(tenant.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
			toast.success('Tenant updated successfully')
			setEditOpen(false)
		},
		meta: {
			operation: 'update',
			entityType: 'tenant'
		}
	})

	const deleteMutation = useMutation({
		mutationFn: () => tenantsApi.remove(tenant.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			toast.error('Failed to delete tenant')
			logger.error('Failed to delete tenant', { action: 'deleteTenant' }, error)
		},
		meta: {
			operation: 'delete',
			entityType: 'tenant'
		}
	})

	return (
		<ButtonGroup>
			{/* View Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
				<Eye className="w-4 h-4" />
				View
			</Button>

			{/* Edit Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
				<Edit className="w-4 h-4" />
				Edit
			</Button>

			{/* Delete Button & Dialog */}
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Tenant</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{tenant.name}"? This action
							cannot be undone and will remove all associated data including
							leases and payment records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete Tenant'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-gradient">Edit Tenant</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="firstName">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-firstName">First Name</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<User className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-firstName"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
												placeholder="John"
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="lastName">
								{field => (
									<Field>
										<FieldLabel htmlFor="edit-lastName">Last Name</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<User className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="edit-lastName"
												value={field.state.value}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													field.handleChange(e.target.value)
												}
												onBlur={field.handleBlur}
												placeholder="Smith"
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>
						</div>

						<form.Field name="email">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit-email">Email Address</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Mail className="w-4 h-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="edit-email"
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
										<FieldError>
											{String(field.state.meta.errors[0])}
										</FieldError>
									)}
								</Field>
							)}
						</form.Field>

						<form.Field name="phone">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit-phone">Phone Number</FieldLabel>
									<InputGroup>
										<InputGroupAddon align="inline-start">
											<Phone className="w-4 h-4" />
										</InputGroupAddon>
										<InputGroupInput
											id="edit-phone"
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
										<FieldError>
											{String(field.state.meta.errors[0])}
										</FieldError>
									)}
								</Field>
							)}
						</form.Field>

						<form.Field name="emergencyContact">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit-emergencyContact">
										Emergency Contact
									</FieldLabel>
									<Textarea
										id="edit-emergencyContact"
										value={field.state.value}
										onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										placeholder="Emergency contact information..."
										rows={3}
									/>
									{field.state.meta.errors?.length && (
										<FieldError>
											{String(field.state.meta.errors[0])}
										</FieldError>
									)}
								</Field>
							)}
						</form.Field>

						<div className="flex justify-end pt-2">
							<ButtonGroup>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateMutation.isPending}>
									{updateMutation.isPending ? 'Updating...' : 'Update Tenant'}
								</Button>
							</ButtonGroup>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* View Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<User className="w-5 h-5" />
							{tenant.name}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-6">
						{/* Contact Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">{tenant.email}</p>
									<p className="text-sm text-muted-foreground">Email Address</p>
								</div>
							</div>

							{tenant.phone && (
								<div className="flex items-center gap-2">
									<Phone className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="font-medium">{tenant.phone}</p>
										<p className="text-sm text-muted-foreground">
											Phone Number
										</p>
									</div>
								</div>
							)}

							{tenant.emergencyContact && (
								<div className="flex items-start gap-2">
									<Phone className="w-4 h-4 text-muted-foreground mt-1" />
									<div>
										<p className="font-medium">Emergency Contact</p>
										<p className="text-sm text-muted-foreground">
											{tenant.emergencyContact}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Property & Lease Information */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<MapPin className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Property</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.property?.name || 'No Property Assigned'}
								</span>
							</div>

							{tenant.currentLease && (
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<CreditCard className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm font-medium">Monthly Rent</span>
									</div>
									<span className="text-sm text-muted-foreground">
										${tenant.currentLease.rentAmount?.toLocaleString() || '0'}
									</span>
								</div>
							)}

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Tenant Since</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{tenant.createdAt
										? new Date(tenant.createdAt).toLocaleDateString()
										: 'Unknown'}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<User className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Status</span>
								</div>
								<Badge
									style={{
										backgroundColor: 'var(--chart-1)',
										color: 'hsl(var(--primary-foreground))'
									}}
								>
									Active
								</Badge>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end pt-4 border-t">
							<ButtonGroup>
								<Button variant="outline" onClick={() => setViewOpen(false)}>
									Close
								</Button>
								<Button
									onClick={() => {
										setViewOpen(false)
										setEditOpen(true)
									}}
								>
									Edit Tenant
								</Button>
							</ButtonGroup>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</ButtonGroup>
	)
}
