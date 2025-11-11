'use client'

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
import { Field, FieldLabel } from '#components/ui/field'
import { tenantKeys } from '#hooks/api/use-tenant'
import { useModalStore } from '#stores/modal-store'
import type { UpdateTenantInput } from '@repo/shared/types/api-inputs'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import {
	tenantUpdateSchema,
	type TenantUpdate
} from '@repo/shared/validation/tenants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { clientFetch } from '#lib/api/client'

interface EditTenantDialogProps {
	tenant: TenantWithLeaseInfo
}

export function EditTenantDialog({ tenant }: EditTenantDialogProps) {
	const { closeModal } = useModalStore()
	const queryClient = useQueryClient()

	const modalId = `edit-tenant-${tenant.id}`

	// Form state for edit dialog
	const [formData, setFormData] = useState({
		firstName: tenant.name?.split(' ')[0] || '',
		lastName: tenant.name?.split(' ').slice(1).join(' ') || '',
		email: tenant.email || '',
		phone: tenant.phone || '',
		emergencyContact: tenant.emergencyContact || ''
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
	)
}
