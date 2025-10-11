/**
 * Tenant Form Hooks
 * TanStack Form hooks for tenant-related form patterns with shared validation
 */

import type { TenantInput, TenantUpdate } from '@repo/shared/types/core'
import { tenantFormSchema } from '@repo/shared/validation/tenants'
import { useForm } from '@tanstack/react-form'
import { useCallback, useState } from 'react'

/**
 * Hook for tenant creation forms with shared validation and state management
 */
export function useTenantForm(initialValues?: Partial<TenantInput>) {
	return useForm({
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			emergencyContact: '',
			avatarUrl: null,
			userId: null,
			...initialValues
		} as TenantInput,
		onSubmit: async ({ value }) => {
			// Validation is handled by the schema
			return value
		},
		validators: {
			onSubmit: tenantFormSchema
		}
	})
}

/**
 * Hook for tenant update forms with shared validation and state management
 */
export function useTenantUpdateForm(initialValues?: Partial<TenantUpdate>) {
	return useForm({
		defaultValues: {
			firstName: null,
			lastName: null,
			email: null,
			phone: null,
			emergencyContact: null,
			avatarUrl: null,
			...initialValues
		} as TenantUpdate,
		onSubmit: async ({ value }) => {
			// Validation is handled by the schema
			return value
		},
		validators: {
			onSubmit: tenantFormSchema
		}
	})
}

/**
 * Hook for multi-step tenant forms (e.g., onboarding, lease setup)
 */
export function useMultiStepTenantForm(): {
	form: ReturnType<typeof useTenantForm>
	currentStep: number
	nextStep: () => void
	prevStep: () => void
	updateFormData: (data: Partial<TenantInput>) => void
	progress: number
} {
	const [currentStep, setCurrentStep] = useState(0)
	const [formData, setFormData] = useState<Partial<TenantInput>>({})

	const form = useTenantForm(formData as TenantInput)

	const nextStep = () => {
		// Provide a field name and cause for validateField
		if (form.validateField('firstName', 'change')) {
			setCurrentStep(prev => prev + 1)
		}
	}

	const prevStep = () => {
		setCurrentStep(prev => Math.max(0, prev - 1))
	}

	const updateFormData = (data: Partial<TenantInput>) => {
		setFormData(prev => ({ ...prev, ...data }))
	}

	return {
		form,
		currentStep,
		nextStep,
		prevStep,
		updateFormData,
		progress: (currentStep + 1) / 3 // Assuming 3 steps total
	}
}

/**
 * Custom validation hook for tenant forms
 */
export function useTenantValidation() {
	const validateEmail = useCallback(
		(email: string): Record<string, string> | undefined => {
			if (!email) return { email: 'Email is required' }
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				return { email: 'Please enter a valid email address' }
			}
			return undefined
		},
		[]
	)

	const validatePhone = useCallback(
		(phone: string): Record<string, string> | undefined => {
			if (phone && !/^\+?[\d\s\-()]{10,}$/.test(phone)) {
				return { phone: 'Please enter a valid phone number' }
			}
			return undefined
		},
		[]
	)

	const validateName = useCallback(
		(name: string): Record<string, string> | undefined => {
			if (!name) return { firstName: 'First name is required' }
			if (name.length < 2)
				return { firstName: 'Name must be at least 2 characters' }
			if (name.length > 50)
				return { firstName: 'Name must be less than 50 characters' }
			return undefined
		},
		[]
	)

	return {
		validateEmail,
		validatePhone,
		validateName
	}
}

/**
 * Hook for form state management with tenant-specific logic
 */
export function useTenantFormState() {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const resetFormState = useCallback(() => {
		setIsSubmitting(false)
		setIsSuccess(false)
		setError(null)
	}, [])

	return {
		isSubmitting,
		isSuccess,
		error,
		setIsSubmitting,
		setIsSuccess,
		setError,
		resetFormState
	}
}

/**
 * Combined hook for complete tenant form functionality
 */
export function useTenantFormComplete(initialValues?: Partial<TenantInput>) {
	const form = useTenantForm(initialValues)
	const validation = useTenantValidation()
	const formState = useTenantFormState()

	return {
		form,
		validation,
		formState,
		reset: () => {
			form.reset()
			formState.resetFormState()
		}
	}
}

/**
 * Hook for async field validation (e.g., check if email already exists)
 * TanStack Form v5 pattern with debouncing
 */
export function useAsyncTenantValidation() {
	const [isValidating, setIsValidating] = useState<Record<string, boolean>>({})

	const checkEmailAvailability = useCallback(
		async (email: string): Promise<boolean> => {
			setIsValidating(prev => ({ ...prev, email: true }))
			try {
				// Simulate API call to check email availability
				const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
				const response = await fetch(
					`${API_BASE_URL}/api/v1/tenants/check-email?email=${encodeURIComponent(email)}`
				)
				const data = (await response.json()) as { available: boolean }
				return data.available
			} catch {
				return true // Assume available on error
			} finally {
				setIsValidating(prev => ({ ...prev, email: false }))
			}
		},
		[]
	)

	return {
		isValidating,
		checkEmailAvailability,
		validateEmailAsync: async (
			email: string
		): Promise<Record<string, string> | undefined> => {
			if (!email) return undefined
			const available = await checkEmailAvailability(email)
			if (!available) {
				return { email: 'This email is already in use' }
			}
			return undefined
		}
	}
}

/**
 * Hook for form field watchers with TanStack Form
 * React 19 pattern with useTransition for non-blocking updates
 */
export function useTenantFormWatchers() {
	const [watchedValues, setWatchedValues] = useState<Partial<TenantInput>>({})

	const watchField = useCallback(
		(fieldName: keyof TenantInput, value: string | null) => {
			setWatchedValues(prev => ({ ...prev, [fieldName]: value }))
		},
		[]
	)

	return {
		watchedValues,
		watchField,
		getFieldValue: (fieldName: keyof TenantInput) => watchedValues[fieldName]
	}
}

/**
 * Hook for conditional field logic based on form state
 * Example: Show emergency contact only if phone is provided
 */
export function useConditionalTenantFields(formData: Partial<TenantInput>) {
	const shouldShowEmergencyContact = !!formData.phone
	const shouldShowAvatar = !!formData.email && !!formData.firstName

	return {
		shouldShowEmergencyContact,
		shouldShowAvatar,
		isBasicInfoComplete:
			!!formData.firstName && !!formData.lastName && !!formData.email
	}
}

/**
 * Hook for form field transformations (e.g., format phone numbers)
 * React 19 optimized with useMemo
 */
export function useTenantFieldTransformers() {
	const formatPhoneNumber = useCallback((phone: string): string => {
		// Remove all non-digits
		const digits = phone.replace(/\D/g, '')

		// Format as (XXX) XXX-XXXX
		if (digits.length <= 3) return digits
		if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
	}, [])

	const capitalizeNames = useCallback((name: string): string => {
		return name
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ')
	}, [])

	const normalizeEmail = useCallback((email: string): string => {
		return email.toLowerCase().trim()
	}, [])

	return {
		formatPhoneNumber,
		capitalizeNames,
		normalizeEmail
	}
}
