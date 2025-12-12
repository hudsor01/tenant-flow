'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { useUpdateTenantMutation } from '#hooks/api/mutations/tenant-mutations'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import { tenantUpdateSchema } from '@repo/shared/validation/tenants'
import { useState } from 'react'
import { toast } from 'sonner'

interface EditTenantDialogProps {
	tenant: TenantWithLeaseInfo
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function EditTenantDialog({ tenant, open, onOpenChange }: EditTenantDialogProps) {
	const updateMutation = useUpdateTenantMutation()

	// Form state for edit dialog - only tenant-specific fields
	const [formData, setFormData] = useState({
		emergency_contact_name: tenant.emergency_contact_name || '',
		emergency_contact_phone: tenant.emergency_contact_phone || '',
		emergency_contact_relationship: tenant.emergency_contact_relationship || ''
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

		updateMutation.mutate({
			id: tenant.id,
			data: formData
		})
	}

	const handleInputChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const handleCancel = () => {
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent intent="edit" className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Tenant</DialogTitle>
					<DialogDescription>
						Update tenant information including emergency contact details.
					</DialogDescription>
				</DialogHeader>

				<DialogBody>
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
				</DialogBody>

				<DialogFooter>
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
