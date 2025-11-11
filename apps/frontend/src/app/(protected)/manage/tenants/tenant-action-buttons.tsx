'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	CrudDialog,
	CrudDialogContent,
	CrudDialogDescription,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogBody,
	CrudDialogFooter
} from '#components/ui/crud-dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Field, FieldLabel } from '#components/ui/field'
import { useModalStore } from '#stores/modal-store'
import { tenantKeys } from '#hooks/api/use-tenant'
import type { UpdateTenantInput } from '@repo/shared/types/api-inputs'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import {
	tenantUpdateSchema,
	type TenantUpdate
} from '@repo/shared/validation/tenants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Calendar,
	DollarSign,
	Edit,
	Eye,
	Mail,
	MapPin,
	MoreVertical,
	Phone,
	Send,
	Trash2
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { clientFetch } from '#lib/api/client'

interface TenantActionButtonsProps {
	tenant: TenantWithLeaseInfo
}

export function TenantActionButtons({ tenant }: TenantActionButtonsProps) {
	const { openModal, closeModal } = useModalStore()
	const queryClient = useQueryClient()

	// Form state for edit dialog
	const [formData, setFormData] = useState({
		firstName: tenant.name?.split(' ')[0] || '',
		lastName: tenant.name?.split(' ').slice(1).join(' ') || '',
		email: tenant.email || '',
		phone: tenant.phone || '',
		emergencyContact: tenant.emergencyContact || ''
	})

	const modalId = `edit-tenant-${tenant.id}`

	const deleteMutation = useMutation({
		mutationFn: async () => {
			await clientFetch(`/api/v1/tenants/${tenant.id}`, { method: 'DELETE' })
		},
		onSuccess: () => {
			queryClient.setQueryData(
				['tenants'],
				(old: TenantWithLeaseInfo[] | undefined) => {
					if (!Array.isArray(old)) return old
					return old.filter(t => t.id !== tenant.id)
				}
			)
			queryClient.invalidateQueries({ queryKey: ['tenant-stats'] })
			queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			queryClient.invalidateQueries({ queryKey: ['leases'] })
			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			toast.error(`Failed to delete tenant: ${error.message}`)
		}
	})

	const inviteMutation = useMutation({
		mutationFn: async () => {
			return await clientFetch(
				`/api/v1/tenants/${tenant.id}/resend-invitation`,
				{
					method: 'POST',
					body: JSON.stringify({})
				}
			)
		},
		onSuccess: () => {
			toast.success('Invitation sent successfully')
		},
		onError: (error: Error) => {
			toast.error(`Failed to send invitation: ${error.message}`)
		}
	})

	const updateMutation = useMutation({
		mutationFn: async (data: TenantUpdate) => {
			const payload: UpdateTenantInput = {}

			const assignNullable = (
				key: keyof Pick<
					UpdateTenantInput,
					| 'avatarUrl'
					| 'phone'
					| 'emergencyContact'
					| 'firstName'
					| 'lastName'
					| 'name'
					| 'userId'
				>,
				value: string | null | undefined
			) => {
				if (value !== undefined) {
					payload[key] = value === null ? null : value
				}
			}

			if (data.email !== undefined) {
				payload.email = data.email
			}

			assignNullable('avatarUrl', data.avatarUrl)
			assignNullable('phone', data.phone)
			assignNullable('emergencyContact', data.emergencyContact)
			assignNullable('firstName', data.firstName)
			assignNullable('lastName', data.lastName)
			assignNullable('name', data.name)
			assignNullable('userId', data.userId)

			return await clientFetch<TenantWithLeaseInfo>(
				`/api/v1/tenants/${tenant.id}`,
				{
					method: 'PATCH',
					body: JSON.stringify(payload)
				}
			)
		},
		onSuccess: (updated: TenantWithLeaseInfo) => {
			// Update single tenant cache and the tenants list without refetch
			queryClient.setQueryData(tenantKeys.detail(tenant.id), updated)
			queryClient.setQueryData(
				tenantKeys.list(),
				(old: TenantWithLeaseInfo[] | undefined) => {
					if (!Array.isArray(old)) return old
					return old.map(t => (t.id === tenant.id ? { ...t, ...updated } : t))
				}
			)
			toast.success('Tenant updated successfully')
			closeModal(modalId)
		},
		onError: error => {
			toast.error(`Failed to update tenant: ${error.message}`)
		}
	})

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		// Validate form data
		const result = tenantUpdateSchema.safeParse(formData)
		if (!result.success) {
			const firstError = result.error.issues[0]
			toast.error('Validation failed', {
				description: firstError?.message || 'Please check your input'
			})
			return
		}

		updateMutation.mutate(formData)
	}

	const handleInputChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const handleCancel = () => {
		closeModal(modalId)
	}

	return (
		<div className="flex items-center gap-2">
			{/* Primary Action: View Details */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => openModal(`view-tenant-${tenant.id}`)}
				className="gap-2"
			>
				<Eye className="size-4" />
				View
			</Button>

			{/* Secondary Actions Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => openModal(`edit-tenant-${tenant.id}`)}
						className="gap-2"
					>
						<Edit className="size-4" />
						Edit Tenant
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => inviteMutation.mutate()}
						className="gap-2"
					>
						<Send className="size-4" />
						Send Invitation
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => {
							if (confirm('Are you sure you want to delete this tenant?')) {
								deleteMutation.mutate()
							}
						}}
						className="gap-2 text-destructive focus:text-destructive"
					>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Modal Components */}
			<CrudDialog mode="read" modalId={`view-tenant-${tenant.id}`}>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Tenant Details</CrudDialogTitle>
						<CrudDialogDescription>View tenant information</CrudDialogDescription>
					</CrudDialogHeader>
					<CrudDialogBody>
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
							<div>
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
					</CrudDialogBody>
				</CrudDialogContent>
			</CrudDialog>

			<CrudDialog mode="edit" modalId={modalId}>
				<CrudDialogContent className="sm:max-w-md">
					<CrudDialogHeader>
						<CrudDialogTitle>Edit Tenant</CrudDialogTitle>
						<CrudDialogDescription>
							Update tenant information including contact details and emergency
							contacts.
						</CrudDialogDescription>
					</CrudDialogHeader>

					<CrudDialogBody>
						<form onSubmit={handleFormSubmit} className="space-y-4">
							<Field>
								<FieldLabel>First Name</FieldLabel>
								<input
									value={formData.firstName}
									onChange={e => handleInputChange('firstName', e.target.value)}
									type="text"
									required
									placeholder="Enter first name"
									className="input"
								/>
							</Field>

							<Field>
								<FieldLabel>Last Name</FieldLabel>
								<input
									value={formData.lastName}
									onChange={e => handleInputChange('lastName', e.target.value)}
									type="text"
									required
									placeholder="Enter last name"
									className="input"
								/>
							</Field>

							<Field>
								<FieldLabel>Email</FieldLabel>
								<input
									value={formData.email}
									onChange={e => handleInputChange('email', e.target.value)}
									type="email"
									required
									placeholder="Enter email"
									className="input"
								/>
							</Field>

							<Field>
								<FieldLabel>Phone</FieldLabel>
								<input
									value={formData.phone}
									onChange={e => handleInputChange('phone', e.target.value)}
									type="text"
									placeholder="Enter phone number"
									className="input"
								/>
							</Field>

							<Field>
								<FieldLabel>Emergency Contact</FieldLabel>
								<input
									value={formData.emergencyContact}
									onChange={e =>
										handleInputChange('emergencyContact', e.target.value)
									}
									type="text"
									placeholder="Enter emergency contact"
									className="input"
								/>
							</Field>
						</form>
					</CrudDialogBody>

					<CrudDialogFooter>
						<Button type="button" variant="outline" onClick={handleCancel}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={updateMutation.isPending}
							onClick={() => document.querySelector('form')?.requestSubmit()}
						>
							{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
						</Button>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		</div>
	)
}
