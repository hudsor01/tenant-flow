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

	// Form state for edit dialog - only tenant-specific fields
	const [formData, setFormData] = useState({
		emergency_contact_name: tenant.emergency_contact_name || '',
		emergency_contact_phone: tenant.emergency_contact_phone || '',
		emergency_contact_relationship: tenant.emergency_contact_relationship || ''
	})

	const updateMutation = useMutation({
		mutationFn: async (data: TenantUpdate) => {
			const payload: UpdateTenantInput = {}

			// Only include tenant-specific fields - user fields are updated separately
			if (data.emergency_contact_name !== undefined) {
				payload.emergency_contact_name = data.emergency_contact_name
			}
			if (data.emergency_contact_phone !== undefined) {
				payload.emergency_contact_phone = data.emergency_contact_phone
			}
			if (data.emergency_contact_relationship !== undefined) {
				payload.emergency_contact_relationship = data.emergency_contact_relationship
			}

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
						Update tenant information including emergency contact details.
					</CrudDialogDescription>
				</CrudDialogHeader>

				<CrudDialogBody>
					<form onSubmit={handleFormSubmit} className="space-y-4">
						<Field>
							<FieldLabel>Emergency Contact Name</FieldLabel>
							<input
								value={formData.emergency_contact_name}
								onChange={e =>
									handleInputChange('emergency_contact_name', e.target.value)
								}
								type="text"
								placeholder="Enter emergency contact name"
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
