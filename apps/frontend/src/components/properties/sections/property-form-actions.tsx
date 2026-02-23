'use client'

import { CheckCircle } from 'lucide-react'
import { Button } from '#components/ui/button'

interface PropertyFormActionsProps {
	mode: 'create' | 'edit'
	isPending: boolean
	uploadingImages: boolean
}

export function PropertyFormActions({
	mode,
	isPending,
	uploadingImages
}: PropertyFormActionsProps) {
	const submitLabel = uploadingImages
		? 'Uploading images...'
		: isPending
			? mode === 'create'
				? 'Creating...'
				: 'Updating...'
			: mode === 'create'
				? 'Create Property'
				: 'Update Property'

	return (
		<div className="flex justify-end gap-4 pt-6 border-t">
			<Button
				type="button"
				variant="outline"
				onClick={() => window.history.back()}
			>
				Cancel
			</Button>

			<Button
				type="submit"
				disabled={isPending || uploadingImages}
				className="flex items-center gap-2"
			>
				<CheckCircle className="size-4" />
				{submitLabel}
			</Button>
		</div>
	)
}
