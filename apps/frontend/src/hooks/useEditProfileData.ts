/**
 * Profile editing data hook
 * Provides profile form data and update functionality
 */

import { useState } from 'react'
import type { UpdateUserProfileInput } from '@repo/shared'
import { logger } from '@/lib/logger'

export interface ProfileData {
	name: string
	email: string
	phone?: string
	company?: string
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
			const { apiClient } = await import('@/lib/api-client')
			await apiClient.put('/api/v1/auth/profile', data)
			logger.info('Profile updated successfully', { data })
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update profile')
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