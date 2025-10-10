/**
 * React 19 form progress persistence hook
 * Local form progress saving (no backend dependency)
 * Follows Supabase Auth-first architecture
 */

'use client'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { FormProgressData } from '@repo/shared/types/core'
import {
	startTransition,
	useDeferredValue,
	useEffect,
	useState,
	useCallback
} from 'react'

const logger = createLogger({ component: 'FormProgressHook' })

type FormType = 'signup' | 'login' | 'reset' | 'contact'

interface FormProgressState {
	data: FormProgressData | null
	isLoading: boolean
	error: string | null
}

/**
 * React 19 form progress persistence hook
 * Local persistence with automatic progress management
 */
export function useFormProgress(formType: FormType) {
	const [state, setState] = useState<FormProgressState>({
		data: null,
		isLoading: true,
		error: null
	})

	// Load draft on mount - only after hydration
	useEffect(() => {
		let mounted = true

		const loadDraft = () => {
			// Ensure we're on the client side and hydration is complete
			if (typeof window === 'undefined') return

			try {
				const savedData = localStorage.getItem(`form-progress-${formType}`)
				const data = savedData ? JSON.parse(savedData) : null

				if (mounted) {
					setState(prev => ({
						...prev,
						data,
						isLoading: false
					}))
				}
			} catch (error) {
				if (mounted) {
					setState(prev => ({
						...prev,
						error:
							error instanceof Error ? error.message : 'Failed to load draft',
						isLoading: false
					}))
				}
			}
		}

		// Delay to ensure hydration is complete
		const timeoutId = setTimeout(loadDraft, 100)

		return () => {
			mounted = false
			clearTimeout(timeoutId)
		}
	}, [formType])

	// Save progress function with local storage (excludes sensitive data)
	// CRITICAL: useCallback to prevent infinite re-renders in dependent useEffect hooks
	const saveProgress = useCallback(
		async (data: FormProgressData): Promise<void> => {
			try {
				// Skip if no meaningful data to save
				if (!data.email && !data.name) return

				// Security: Never save passwords locally
				const safeData = { ...data }
				delete safeData.password
				delete safeData.confirmPassword

				// Save to localStorage
				localStorage.setItem(
					`form-progress-${formType}`,
					JSON.stringify(safeData)
				)

				setState(prev => ({
					...prev,
					data: safeData,
					error: null
				}))
			} catch (error) {
				// Graceful degradation - don't break the form
				logger.warn('Failed to save form progress', {
					action: 'form_progress_save_failed',
					metadata: {
						formType,
						hasEmail: !!data.email,
						hasName: !!data.name,
						error: error instanceof Error ? error.message : String(error)
					}
				})
				setState(prev => ({
					...prev,
					error:
						error instanceof Error ? error.message : 'Failed to save progress'
				}))
			}
		},
		[formType]
	)

	// Clear progress (on successful submission)
	// CRITICAL: useCallback to prevent infinite re-renders
	const clearProgress = useCallback(() => {
		localStorage.removeItem(`form-progress-${formType}`)
		setState(prev => ({
			...prev,
			data: null,
			error: null
		}))
	}, [formType])

	return {
		...state,
		saveProgress,
		clearProgress
	}
}

/**
 * React 19 enhanced form state hook
 * Combines useFormState with automatic progress persistence
 */
export function useFormWithProgress<T extends FormProgressData>(
	formType: FormType,
	onSubmit: (data: T) => Promise<void>,
	defaultValues: T
) {
	const progress = useFormProgress(formType)
	const [formData, setFormData] = useState<T>(defaultValues) // Start with clean defaults
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [isHydrated, setIsHydrated] = useState(false)

	// Mark as hydrated on client
	useEffect(() => {
		setIsHydrated(true)
	}, [])

	// React 19: Use deferred values for non-urgent updates
	const deferredFormData = useDeferredValue(formData)

	// Auto-save progress when form data changes (deferred) - only after hydration, excluding passwords
	useEffect(() => {
		if (
			isHydrated &&
			!progress.isLoading &&
			(deferredFormData.email || deferredFormData.name)
		) {
			startTransition(() => {
				// Security: Never auto-save passwords
				const safeData = { ...deferredFormData }
				delete safeData.password
				delete safeData.confirmPassword
				progress.saveProgress(safeData)
			})
		}
	}, [deferredFormData, progress, isHydrated])

	// Restore progress data when loaded - only after hydration
	useEffect(() => {
		if (isHydrated && progress.data && !progress.isLoading) {
			setFormData(prev => ({ ...prev, ...progress.data }))
		}
	}, [progress.data, progress.isLoading, isHydrated])

	const handleSubmit = async (data: T) => {
		setIsSubmitting(true)
		setSubmitError(null)

		try {
			await onSubmit(data)
			progress.clearProgress()
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : 'Submission failed'
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateField = <K extends keyof T>(field: K, value: T[K]) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	return {
		formData,
		updateField,
		handleSubmit,
		isSubmitting,
		submitError,
		isHydrated,
		progress: {
			isLoading: progress.isLoading,
			error: progress.error,
			hasData: !!progress.data
		}
	}
}
