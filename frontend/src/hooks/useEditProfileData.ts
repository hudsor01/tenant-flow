import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/entities'

// Form validation schemas
const profileSchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters'),
	phone: z
		.string()
		.regex(/^[\d\s\-+()]*$/, 'Invalid phone number format')
		.optional()
		.or(z.literal('')),
	bio: z.string().max(500, 'Bio must be less than 500 characters').optional()
})

const passwordSchema = z
	.object({
		currentPass: z
			.string()
			.min(6, 'Password must be at least 6 characters'),
		newPass: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPass: z.string().min(6, 'Password must be at least 6 characters')
	})
	.refine(data => data.newPass === data.confirmPass, {
		message: "Passwords don't match",
		path: ['confirmPass']
	})

export type ProfileFormData = z.infer<typeof profileSchema>
export type PasswordFormData = z.infer<typeof passwordSchema>

interface AvatarState {
	onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
	file: File | null
	preview: string | null
	uploading: boolean
}

interface UseEditProfileDataProps {
	user: User
	onClose: () => void
}

/**
 * Custom hook for managing edit profile modal data and state
 * Separates data fetching and state management from UI components
 */
export function useEditProfileData({ user, onClose }: UseEditProfileDataProps) {
	// Tab state
	const [activeTab, setActiveTab] = useState('profile')

	// Avatar state
	const [avatarState, setAvatarState] = useState<AvatarState>({
		file: null,
		preview: null,
		uploading: false,
		onAvatarChange: handleAvatarChange
	})

	// Auth store
	const { updateProfile } = useAuth()

	// Profile form
	const profileForm = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			name: user?.name || '',
			phone: user?.phone || '',
			bio: user?.bio || ''
		}
	})

	// Password form
	const passwordForm = useForm<PasswordFormData>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPass: '',
			newPass: '',
			confirmPass: ''
		}
	})

	// Handle avatar file change
	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Validate file size (max 2MB)
		if (file.size > 2 * 1024 * 1024) {
			toast.error('File size must be less than 2MB')
			return
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			toast.error('Please select an image file')
			return
		}

		// Create preview
		const reader = new FileReader()
		reader.onload = e => {
			setAvatarState({
				file,
				preview: e.target?.result as string,
				uploading: false,
				onAvatarChange: handleAvatarChange
			})
		}
		reader.readAsDataURL(file)
	}

	// Upload avatar to backend
	const uploadAvatar = async (file: File): Promise<string | null> => {
		try {
			setAvatarState(prev => ({ ...prev, uploading: true }))

			// Use the backend avatar upload endpoint that already exists
			const response = await apiClient.http.uploadFile(
				'/users/upload-avatar',
				file
			)

			return response.url
		} catch (error) {
			console.error('Avatar upload error:', error)
			toast.error('Failed to upload avatar')
			return null
		} finally {
			setAvatarState(prev => ({ ...prev, uploading: false }))
		}
	}

	// Handle profile form submission
	const handleProfileSubmit = async (data: ProfileFormData) => {
		try {
			let avatarUrl = user.avatarUrl

			// Upload new avatar if selected
			if (avatarState.file) {
				const uploadedUrl = await uploadAvatar(avatarState.file)
				if (uploadedUrl) {
					avatarUrl = uploadedUrl
				}
			}

			// Update profile
			await updateProfile({
				name: data.name,
				phone: data.phone || undefined,
				bio: data.bio || undefined,
				avatarUrl
			})

			toast.success('Profile updated successfully!')
			handleClose()
		} catch (error) {
			console.error('Profile update error:', error)
			toast.error('Failed to update profile')
		}
	}

	// Handle password form submission
	const handlePasswordSubmit = async (data: PasswordFormData) => {
		try {
			// Use the backend API password update endpoint
			await apiClient.http.post('/auth/update-password', {
				password: data.newPass
			})

			toast.success('Password updated successfully!')
			passwordForm.reset()
		} catch (error) {
			console.error('Password update error:', error)
			toast.error('Failed to update password')
		}
	}

	// Handle modal close
	const handleClose = () => {
		profileForm.reset()
		passwordForm.reset()
		setAvatarState({
			file: null,
			preview: null,
			uploading: false,
			onAvatarChange: handleAvatarChange
		})
		setActiveTab('profile')
		onClose()
	}

	// Get user initials for avatar fallback
	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map(word => word.charAt(0).toUpperCase())
			.join('')
			.slice(0, 2)
	}

	return {
		// State
		activeTab,
		setActiveTab,
		avatarState,

		// Forms
		profileForm,
		passwordForm,

		// Schemas for external use
		profileSchema,
		passwordSchema,

		// Handlers
		handleAvatarChange,
		handleProfileSubmit,
		handlePasswordSubmit,
		handleClose,

		// Utilities
		getInitials
	}
}
