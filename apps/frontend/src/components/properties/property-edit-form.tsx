'use client'

import { PropertyForm } from '@/components/forms/property-form'
import type { Property } from '@repo/shared'

interface PropertyEditFormProps {
	property: Property
	onSuccess?: () => void
	onCancel?: () => void
}

export function PropertyEditForm({
	property,
	onSuccess,
	onCancel
}: PropertyEditFormProps) {
	return (
		<PropertyForm
			property={property}
			onSuccess={onSuccess}
			onCancel={onCancel}
		/>
	)
}
