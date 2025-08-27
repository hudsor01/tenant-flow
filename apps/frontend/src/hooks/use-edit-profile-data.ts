/**
 * Profile editing data hook
 * Provides profile form data and update functionality using secure server actions
 */

import { useState } from 'react'
import { updateProfileAction } from '@/lib/actions/auth-actions'
import type { AuthFormState } from '@/lib/actions/auth-actions'
import type { UpdateUserProfileInput } from '@repo/shared'
import { addCSRFTokenToFormData } from '@/lib/auth/csrf'
import { logger } from '@/lib/logger/logger'

export interface ProfileData {
	name: string
	email: string
	phone?: string
	company?: string
	bio?: string
}

// Export with both names for compatibility
export type ProfileFormData = ProfileData

export interface PasswordFormData {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export function useEditProfileData() {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const updateProfile = async (data: UpdateUserProfileInput) => {
		setIsLoading(true)
		setError(null)
		try {
			logger.info('Profile update requested', { data })

			// Create FormData for server action
			const formData = new FormData()
			formData.append('name', data.name || '')
			if (data.phone) {
				formData.append('phone', data.phone)
			}
			if (data.bio) {
				formData.append('bio', data.bio)
			}
			if (data.company) {
				formData.append('company', data.company)
			}

			// Add CSRF token for security
			addCSRFTokenToFormData(formData)

			// Call the secure server action
			const initialState: AuthFormState = {
				success: false,
				error: undefined
			}
			const result = await updateProfileAction(initialState, formData)

			if (!result.success) {
				const errorMessage = result.error || 'Failed to update profile'
				throw new Error(errorMessage)
			}

			logger.info('Profile updated successfully', {
				message: result.message || 'Profile updated successfully'
			})
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update profile'
			logger.error(
				'Profile update failed',
				err instanceof Error ? err : new Error(String(err))
			)
			setError(errorMessage)
			throw err
		} finally {
			setIsLoading(false)
		}
	}

	return {
		updateProfile,
		isLoading,
		error
	}
}
