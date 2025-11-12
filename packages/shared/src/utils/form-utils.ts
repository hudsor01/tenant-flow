import { z } from 'zod'
import type { FormState } from '../types/forms.js'

/**
 * Utility types and functions for enhanced form state management
 */

// Form validation result with detailed error information
export interface FormValidationResult<T> {
	success: boolean
	data?: T
	errors?: unknown
	fieldErrors: Record<string, string[]>
}

// Generic form error boundary type
export interface FormErrorBoundaryState {
	hasError: boolean
	error?: Error
	errorInfo?: React.ErrorInfo
	errorType?: 'validation' | 'submission' | 'network' | 'unknown'
}

// Enhanced form context type for React Query integration
export interface FormQueryContext<T> {
	previousData?: T
	rollbackData?: T
	isOptimisticUpdate: boolean
	retryCount: number
	lastValidationError?: z.ZodError
}

// Utility function to validate form data against Zod schema
export function validateFormData<T>(
	data: T,
	schema: z.ZodSchema<T>
): FormValidationResult<T> {
	const result = schema.safeParse(data)

	if (result.success) {
		return {
			success: true,
			data: result.data,
			fieldErrors: {}
		}
	}

	const formattedErrors = z.treeifyError(result.error)
	const fieldErrors: Record<string, string[]> = {}

	Object.keys(formattedErrors).forEach(key => {
		const fieldError = formattedErrors[key as keyof typeof formattedErrors]
		if (
			fieldError &&
			typeof fieldError === 'object' &&
			fieldError !== null &&
			'_errors' in fieldError
		) {
			const errors = (fieldError as { _errors: string[] })._errors
			if (Array.isArray(errors)) {
				fieldErrors[key] = errors
			}
		}
	})

	return {
		success: false,
		errors: formattedErrors,
		fieldErrors
	}
}

// Utility function to create initial form state
export function createInitialFormState<T extends Record<string, unknown>>(
	initialValues: T
): FormState<T> {
	const keys = Object.keys(initialValues) as (keyof T)[]

	return {
		values: initialValues,
		errors: keys.reduce(
			(acc, key) => {
				acc[key] = []
				return acc
			},
			{} as Record<keyof T, string[]>
		),
		touched: keys.reduce(
			(acc, key) => {
				acc[key] = false
				return acc
			},
			{} as Record<keyof T, boolean>
		),
		isValid: true,
		isSubmitting: false,
		isValidating: false
	}
}

// Utility function to handle form field changes with validation
export function handleFieldChange<T>(
	state: FormState<T>,
	field: keyof T,
	value: T[keyof T]
): FormState<T> {
	const newValues = { ...state.values, [field]: value }

	return {
		...state,
		values: newValues,
		touched: { ...state.touched, [field]: true }
	}
}

// Utility function to handle form validation errors
export function handleFormErrors<T>(
	state: FormState<T>,
	errors: Record<keyof T, string[]>
): FormState<T> {
	return {
		...state,
		errors,
		isValid: (Object.values(errors) as string[][]).every(
			fieldErrors => fieldErrors.length === 0
		)
	}
}

// React Query mutation error handler with form state integration
export function createFormMutationErrorHandler<T>(
	setFormState: React.Dispatch<React.SetStateAction<FormState<T>>>,
	fieldNameMap?: Record<string, keyof T>
) {
	return (error: Error) => {
		// Extract field-specific errors from API response if possible
		const fieldErrors: Record<keyof T, string[]> = {} as Record<
			keyof T,
			string[]
		>

		// Example: Parse API error response for field-specific errors
		if (error.message.includes('validation')) {
			// Parse validation errors from API response
			try {
				const apiError = JSON.parse(error.message)
				if (apiError.fieldErrors) {
					Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
						const formField = fieldNameMap?.[field] || (field as keyof T)
						fieldErrors[formField] = Array.isArray(messages)
							? messages
							: [messages as string]
					})
				}
			} catch {
				fieldErrors[Object.keys(fieldErrors)[0] as keyof T] = [error.message]
			}
		} else {
			fieldErrors[Object.keys(fieldErrors)[0] as keyof T] = [error.message]
		}

		setFormState(prev => ({
			...prev,
			errors: fieldErrors,
			isValid: false
		}))
	}
}

// Utility type for creating form-specific error boundaries
export type CreateFormErrorBoundaryProps<T> = {
	fallback?: React.ComponentType<{ error: Error; reset: () => void }>
	onError?: (error: FormErrorBoundaryState) => void
	children: React.ReactNode
	formContext?: FormQueryContext<T>
}

// Utility function to debounce form validation
export function debounceValidation<T>(
	validate: (values: T) => FormValidationResult<T>,
	delay: number = 300
): (values: T) => Promise<FormValidationResult<T>> {
	let timeoutId: NodeJS.Timeout

	return (values: T): Promise<FormValidationResult<T>> => {
		return new Promise(resolve => {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(() => {
				resolve(validate(values))
			}, delay)
		})
	}
}

// Utility functions for common form operations
export const formUtils = {
	// Check if a field has errors
	hasFieldError: <T>(state: FormState<T>, field: keyof T): boolean => {
		return state.errors[field] && state.errors[field].length > 0
	},

	// Get first error for a field
	getFieldError: <T>(
		state: FormState<T>,
		field: keyof T
	): string | undefined => {
		const errors = state.errors[field]
		return errors && errors.length > 0 ? errors[0] : undefined
	},

	// Check if form has any errors
	hasErrors: <T>(state: FormState<T>): boolean => {
		return (Object.values(state.errors) as string[][]).some(
			errors => errors.length > 0
		)
	},

	// Check if a field has been touched
	isFieldTouched: <T>(state: FormState<T>, field: keyof T): boolean => {
		return state.touched[field] || false
	},

	// Mark all fields as touched
	markAllTouched: <T>(state: FormState<T>): FormState<T> => {
		const keys = Object.keys(state.touched) as (keyof T)[]
		const touched = keys.reduce(
			(acc, key) => {
				acc[key] = true
				return acc
			},
			{} as Record<keyof T, boolean>
		)

		return { ...state, touched }
	},

	// Clear errors for a specific field
	clearFieldError: <T>(state: FormState<T>, field: keyof T): FormState<T> => {
		return {
			...state,
			errors: { ...state.errors, [field]: [] }
		}
	},

	// Clear all errors
	clearAllErrors: <T>(state: FormState<T>): FormState<T> => {
		const keys = Object.keys(state.errors) as (keyof T)[]
		const errors = keys.reduce(
			(acc, key) => {
				acc[key] = []
				return acc
			},
			{} as Record<keyof T, string[]>
		)

		return { ...state, errors, isValid: true }
	}
}
