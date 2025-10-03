'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tenantsApi } from '@/lib/api-client'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import {
	tenantUpdateSchema,
	type TenantUpdate
} from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Calendar,
	DollarSign,
	Edit,
	Eye,
	Mail,
	MapPin,
	Phone,
	Send,
	Trash2
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

export function TenantActionButtons({ tenant }: TenantActionButtonsProps) {
	const [viewOpen, setViewOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const queryClient = useQueryClient()

	const form = useForm({
		defaultValues: {
			firstName: tenant.name?.split(' ')[0] || '',
			lastName: tenant.name?.split(' ').slice(1).join(' ') || '',
			email: tenant.email || '',
			phone: tenant.phone || '',
			emergencyContact: tenant.emergencyContact || ''
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
		onError: error => {
			toast.error(`Failed to update tenant: ${error.message}`)
		}
	})

	const deleteMutation = useMutation({
		mutationFn: () => tenantsApi.remove(tenant.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
			queryClient.invalidateQueries({ queryKey: ['tenant-stats'] })
			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			toast.error(`Failed to delete tenant: ${error.message}`)
		}
	})

	const inviteMutation = useMutation({
		mutationFn: () =>
			fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/tenants/${tenant.id}/invite`,
				{
					method: 'POST'
				}
			),
		onSuccess: () => {
			toast.success('Invitation sent successfully')
		},
		onError: () => {
			toast.error('Failed to send invitation')
		}
	})

	return (
		<div className="flex items-center gap-1">
			<Button variant="ghost" size="sm" onClick={() => setViewOpen(true)}>
				<Eye className="size-4" />
			</Button>

			<Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
				<Edit className="size-4" />
			</Button>

			<Button variant="ghost" size="sm" onClick={() => inviteMutation.mutate()}>
				<Send className="size-4" />
			</Button>

			<Button
				variant="ghost"
				size="sm"
				onClick={() => {
					if (confirm('Are you sure you want to delete this tenant?')) {
						deleteMutation.mutate()
					}
				}}
			>
				<Trash2 className="size-4" />
			</Button>

			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Tenant Details</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm">
								<Mail className="size-4 text-muted-foreground" />
								<span className="font-medium">Email:</span>
								<span>{tenant.email || 'N/A'}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Phone className="size-4 text-muted-foreground" />
								<span className="font-medium">Phone:</span>
								<span>{tenant.phone || 'N/A'}</span>
							</div>
							{tenant.emergencyContact && (
								<div className="flex items-center gap-2 text-sm">
									<Phone className="size-4 text-muted-foreground" />
									<span className="font-medium">Emergency Contact:</span>
									<span>{tenant.emergencyContact}</span>
								</div>
							)}
							{tenant.unit && (
								<div className="flex items-center gap-2 text-sm">
									<MapPin className="size-4 text-muted-foreground" />
									<span className="font-medium">Unit:</span>
									<span>{tenant.unit.unitNumber}</span>
								</div>
							)}
							{tenant.currentLease && (
								<>
									<div className="flex items-center gap-2 text-sm">
										<Calendar className="size-4 text-muted-foreground" />
										<span className="font-medium">Lease:</span>
										<span>
											{tenant.currentLease.startDate} -{' '}
											{tenant.currentLease.endDate}
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<DollarSign className="size-4 text-muted-foreground" />
										<span className="font-medium">Rent:</span>
										<span>${tenant.currentLease.rentAmount}</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<Badge
											variant={
												tenant.currentLease.status === 'ACTIVE'
													? 'default'
													: 'secondary'
											}
										>
											{tenant.currentLease.status}
										</Badge>
									</div>
								</>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Tenant</DialogTitle>
						<DialogDescription>
							Update tenant information including contact details and emergency
							contacts.
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>
						<form.Field name="firstName">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-firstName">First Name</Label>
									<Input
										id="edit-firstName"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="lastName">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-lastName">Last Name</Label>
									<Input
										id="edit-lastName"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="email">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-email">Email</Label>
									<Input
										id="edit-email"
										type="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="phone">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-phone">Phone</Label>
									<Input
										id="edit-phone"
										type="tel"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="emergencyContact">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-emergencyContact">
										Emergency Contact
									</Label>
									<Input
										id="edit-emergencyContact"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
