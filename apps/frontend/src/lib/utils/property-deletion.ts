/**
 * Property deletion utilities for secure mutation-based operations
 */

import {
	deletePropertyAction,
	type PropertyFormState
} from '@/lib/actions/property-actions'
import { addCSRFTokenToFormData } from '@/lib/auth/csrf'
import { logger } from '@/lib/logger/logger'
import { notifications, dismissToast } from '@/lib/toast'

/**
 * Secure property deletion with confirmation and proper error handling
 */
export async function deletePropertyWithConfirmation(property: {
	id: string
	name: string
}): Promise<void> {
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

		// Add CSRF token for security
		addCSRFTokenToFormData(formData)

		// Show loading toast
		const loadingToast = notifications.loading('Deleting property...')

		// Execute server action
		const initialState: PropertyFormState = { success: false }
		const result = await deletePropertyAction(initialState, formData)

		// Dismiss loading toast
		dismissToast(loadingToast)

		if (result.success) {
			logger.info('Property deleted successfully', {
				propertyId: property.id
			})
			notifications.success('Property deleted successfully')

			// Redirect will happen automatically via server action
		} else if (result.errors?._form?.[0]) {
			const errorMessage = result.errors._form[0]
			logger.error('Property deletion failed', new Error(errorMessage), {
				propertyId: property.id
			})
			notifications.error(errorMessage)
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to delete property'
		logger.error(
			'Property deletion error',
			error instanceof Error ? error : new Error(String(error)),
			{
				propertyId: property.id
			}
		)
		notifications.error(errorMessage)
	}
}

/**
 * Property deletion handler for use in table actions
 */
export const createPropertyDeletionHandler = () => {
	return (property: { id: string; name: string }) => {
		void deletePropertyWithConfirmation(property)
	}
}
