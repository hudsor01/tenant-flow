/**
 * Property deletion hook with secure server action integration
 * Provides confirmation dialog and proper error handling
 */

import { useActionState } from 'react'
import { deleteProperty as deletePropertyAction } from '@/app/actions/properties'
import { logger } from '@/lib/logger/logger'

interface PropertyDeletionConfig {
	onSuccess?: () => void
	onError?: (error: string) => void
}

interface PropertyDeletionState {
	success: boolean
	error?: string
}

export function usePropertyDeletion(_config: PropertyDeletionConfig = {}) {
	// Server action wrapper to match useActionState signature
	const wrappedDeleteAction = async (
		prevState: PropertyDeletionState,
		formData: FormData
	): Promise<PropertyDeletionState> => {
		try {
			const propertyId = formData.get('propertyId') as string
			if (!propertyId) {
				return { success: false, error: 'Property ID is required' }
			}
			await deletePropertyAction(propertyId)
			return { success: true }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete property'
			return { success: false, error: errorMessage }
		}
	}

	const initialState: PropertyDeletionState = { success: false }
	const [state, formAction, isPending] = useActionState(
		wrappedDeleteAction,
		initialState
	)

	const deleteProperty = async (property: {
		id: string
		name: string
	}): Promise<void> => {
		// Show confirmation dialog
		const confirmed = window.confirm(
			`Are you sure you want to delete "${property.name}"? This action cannot be undone.`
		)

		if (!confirmed) {
			return
		}

		logger.info('Property deletion initiated', {
			propertyId: property.id,
			propertyName: property.name
		})

		// Create FormData for server action
		const formData = new FormData()
		formData.append('propertyId', property.id)

		// Add CSRF token if available
		const csrfToken = document
			.querySelector('meta[name="csrf-token"]')
			?.getAttribute('content')
		if (csrfToken) {
			formData.append('_token', csrfToken)
		}

		// Submit the form action - React 19 formAction handles FormData internally
		formAction(formData)

		// Note: State updates are handled by useActionState automatically
		// Success/error handling should be done via useEffect or similar
	}

	return {
		deleteProperty,
		isPending,
		error: state.error || null,
		isSuccess: state.success
	}
}