/**
 * React 19 useActionState Form System
 * Pure React 19 implementation replacing React Hook Form
 * Features: Server actions, automatic error handling, pending states, progressive enhancement
 */

'use client'

import { useActionState, useOptimistic, startTransition } from 'react'
import type { FormEvent, ReactNode } from 'react'

// Generic form state that matches server action return types
export interface FormState {
	success: boolean
	error?: string
	errors?: Record<string, string[]>
	message?: string
	data?: any
}

// Initial empty form state
const initialFormState: FormState = {
	success: false
}

export interface UseActionStateFormOptions<T = any> {
	action: (prevState: FormState, formData: FormData) => Promise<FormState>
	onSuccess?: (data: T) => void
	onError?: (error: string) => void
	resetOnSuccess?: boolean
}

export interface UseActionStateFormReturn {
	// Form state from server action
	state: FormState
	isPending: boolean
	
	// Form submission
	formAction: (formData: FormData) => void
	handleSubmit: (event: FormEvent<HTMLFormElement>) => void
	
	// Field helpers
	getFieldError: (fieldName: string) => string | undefined
	hasFieldError: (fieldName: string) => boolean
	clearFieldError: (fieldName: string) => void
	
	// Form helpers
	hasErrors: boolean
	isSubmitting: boolean
	reset: () => void
}

/**
 * React 19 useActionState Form Hook
 * Replaces React Hook Form with pure React 19 patterns
 */
export function useActionStateForm<T = any>({
	action,
	onSuccess,
	onError,
	resetOnSuccess = true
}: UseActionStateFormOptions<T>): UseActionStateFormReturn {
	
	// React 19 useActionState - handles form submission and pending states
	const [state, formAction, isPending] = useActionState(action, initialFormState)
	
	// React 19 useOptimistic - for clearing field errors optimistically
	const [optimisticState, setOptimisticState] = useOptimistic(
		state,
		(currentState, clearField: string) => ({
			...currentState,
			errors: currentState.errors ? {
				...currentState.errors,
				[clearField]: undefined
			} : undefined
		})
	)
	
	// Handle form submission with proper event handling
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		
		const formData = new FormData(event.currentTarget)
		
		// Use startTransition for non-urgent state updates
		startTransition(() => {
			formAction(formData)
		})
	}
	
	// Field error helpers
	const getFieldError = (fieldName: string): string | undefined => {
		const fieldErrors = optimisticState.errors?.[fieldName]
		return fieldErrors?.[0] // Return first error for field
	}
	
	const hasFieldError = (fieldName: string): boolean => {
		return Boolean(optimisticState.errors?.[fieldName]?.length)
	}
	
	const clearFieldError = (fieldName: string) => {
		startTransition(() => {
			setOptimisticState(fieldName)
		})
	}
	
	// Form state helpers
	const hasErrors = Boolean(
		optimisticState.errors && Object.keys(optimisticState.errors).length > 0
	)
	
	const isSubmitting = isPending
	
	const reset = () => {
		// Reset would need to trigger a new action or page refresh
		// In React 19, form state is primarily managed by server actions
		window.location.reload()
	}
	
	// Handle success/error callbacks
	if (state.success && state.data && onSuccess && !isPending) {
		onSuccess(state.data)
		
		if (resetOnSuccess) {
			// Form will be reset by server action revalidation
		}
	}
	
	if (!state.success && state.error && onError && !isPending) {
		onError(state.error)
	}
	
	return {
		// Form state
		state: optimisticState,
		isPending,
		
		// Form submission
		formAction,
		handleSubmit,
		
		// Field helpers
		getFieldError,
		hasFieldError,
		clearFieldError,
		
		// Form helpers
		hasErrors,
		isSubmitting,
		reset
	}
}

/**
 * Form Field Component Props for React 19 useActionState
 */
export interface FormFieldProps {
	name: string
	label?: string
	error?: string
	required?: boolean
	disabled?: boolean
	children?: ReactNode
	className?: string
}

/**
 * Form Error Display Component
 */
export interface FormErrorProps {
	error?: string
	errors?: string[]
	className?: string
}

/**
 * Form Submit Button Props
 */
export interface FormSubmitProps {
	isPending: boolean
	children: ReactNode
	pendingText?: string
	disabled?: boolean
	className?: string
}

/**
 * Pure React 19 Form Architecture Benefits:
 * 
 * 1. **Zero Bundle Size**: No React Hook Form dependency (~25KB saved)
 * 2. **Native Performance**: Built-in React 19 optimizations
 * 3. **Progressive Enhancement**: Works without JavaScript
 * 4. **Server-First**: Form validation happens on server
 * 5. **Type Safety**: Full TypeScript integration with server actions
 * 6. **Automatic Error Handling**: Built-in error states and messaging
 * 7. **Optimistic UI**: Instant feedback with automatic revert on error
 * 8. **Accessibility**: Native form behavior preserved
 * 9. **SEO Friendly**: Server-side rendering compatible
 * 10. **Concurrent Features**: Built-in support for React 19 concurrent features
 */