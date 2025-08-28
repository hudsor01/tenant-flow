/**
 * Property deletion utilities for secure mutation-based operations
 */

import { deleteProperty } from '@/app/actions/properties'
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

		// Show loading toast
		const loadingToast = notifications.loading('Deleting property...')

		// Execute server action - deleteProperty expects just the ID string
		await deleteProperty(property.id)

		// Dismiss loading toast
		dismissToast(loadingToast)

		// Server action handles success/error - just log completion
		logger.info('Property deletion action completed', {
			propertyId: property.id
		})
		notifications.success('Property deleted successfully')
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
