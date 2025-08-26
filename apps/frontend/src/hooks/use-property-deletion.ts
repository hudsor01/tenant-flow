/**
 * Property deletion hook with secure server action integration
 * Provides confirmation dialog and proper error handling
 */

import { useActionState } from 'react'
import { deletePropertyAction } from '@/lib/actions/property-actions'
import type { PropertyFormState } from '@/lib/actions/property-actions'
import { logger } from '@/lib/logger/logger'

interface PropertyDeletionConfig {
	onSuccess?: () => void
	onError?: (error: string) => void
}

export function usePropertyDeletion(config: PropertyDeletionConfig = {}) {
	const initialState: PropertyFormState = { success: false }
	const [state, formAction, isPending] = useActionState(
		deletePropertyAction,
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

		try {
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
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to delete property'
			logger.error(
				'Property deletion error',
				error instanceof Error ? error : new Error(String(error)),
				{
					propertyId: property.id
				}
			)
			config.onError?.(errorMessage)
		}
	}

	return {
		deleteProperty,
		isPending,
		error: state.error || null,
		isSuccess: state.success
	}
}
