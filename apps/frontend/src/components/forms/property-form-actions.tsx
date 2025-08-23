'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { PropertyFormState } from '@/lib/actions/property-actions'

interface PropertyFormActionsProps {
	mode?: 'create' | 'edit'
	isPending?: boolean
	error?: string
	onCancel?: () => void
}

interface FormErrorDisplayProps {
	error?: string
}

function FormErrorDisplay({ error }: FormErrorDisplayProps) {
	if (!error) {
		return null
	}

	return (
		<div className="bg-destructive/10 border-destructive/20 rounded-md border p-4">
			<div className="flex items-start space-x-3">
				<div className="flex-shrink-0">
					<svg
						className="text-destructive h-5 w-5"
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<div className="flex-1">
					<h3 className="text-destructive text-sm font-medium">
						Form submission error
					</h3>
					<p className="text-destructive/80 mt-1 text-sm">{error}</p>
				</div>
			</div>
		</div>
	)
}

interface ActionButtonsProps {
	mode?: 'create' | 'edit'
	isPending?: boolean
	onCancel?: () => void
}

function ActionButtons({
	mode = 'create',
	isPending,
	onCancel
}: ActionButtonsProps) {
	const submitText = mode === 'create' ? 'Create Property' : 'Update Property'

	return (
		<div className="flex justify-end gap-3">
			{onCancel && (
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancel
				</Button>
			)}
			<Button
				type="submit"
				disabled={isPending}
				className="min-w-[140px]"
			>
				{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				{submitText}
			</Button>
		</div>
	)
}

export function PropertyFormActions({
	mode = 'create',
	isPending,
	error,
	onCancel
}: PropertyFormActionsProps) {
	return (
		<div className="border-border space-y-4 border-t pt-6">
			<FormErrorDisplay error={error} />
			<ActionButtons
				mode={mode}
				isPending={isPending}
				onCancel={onCancel}
			/>
		</div>
	)
}
