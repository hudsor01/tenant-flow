/**
 * Common form state hook to eliminate DRY violations
 * Provides consistent form state management and validation
 */
import { useState, useCallback, type ChangeEvent } from 'react'
import type { FormErrors } from '@/types/forms'

export interface UseFormStateOptions<T> {
	initialValues: T
	validateOnChange?: boolean
	validator?: (values: T) => FormErrors
}

export function useFormState<T extends Record<string, unknown>>(
	options: UseFormStateOptions<T>
) {
	const { initialValues, validateOnChange = false, validator } = options
<<<<<<< HEAD

=======
	
>>>>>>> origin/main
	const [values, setValues] = useState<T>(initialValues)
	const [errors, setErrors] = useState<FormErrors>({})
	const [touched, setTouched] = useState<Record<string, boolean>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = useCallback(
<<<<<<< HEAD
		(field: keyof T) =>
			(
				e: ChangeEvent<
					HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
				>
			) => {
				const value =
					e.target.type === 'checkbox'
						? (e.target as HTMLInputElement).checked
						: e.target.value

				setValues(prev => ({
					...prev,
					[field]: value
				}))

				if (validateOnChange && validator) {
					const newValues = { ...values, [field]: value }
					const newErrors = validator(newValues)
					setErrors(newErrors)
				}
			},
		[values, validateOnChange, validator]
	)

	const handleBlur = useCallback(
		(field: keyof T) => () => {
			setTouched(prev => ({
				...prev,
				[field]: true
			}))
		},
		[]
	)

	const validate = useCallback(() => {
		if (!validator) {
			return true
		}

=======
		(field: keyof T) => (
			e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
		) => {
			const value = e.target.type === 'checkbox' 
				? (e.target as HTMLInputElement).checked 
				: e.target.value

			setValues(prev => ({
				...prev,
				[field]: value
			}))

			if (validateOnChange && validator) {
				const newValues = { ...values, [field]: value }
				const newErrors = validator(newValues)
				setErrors(newErrors)
			}
		},
		[values, validateOnChange, validator]
	)

	const handleBlur = useCallback((field: keyof T) => () => {
		setTouched(prev => ({
			...prev,
			[field]: true
		}))
	}, [])

	const validate = useCallback(() => {
		if (!validator) return true
		
>>>>>>> origin/main
		const newErrors = validator(values)
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}, [values, validator])

	const reset = useCallback(() => {
		setValues(initialValues)
		setErrors({})
		setTouched({})
		setIsSubmitting(false)
	}, [initialValues])

	const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
		setValues(prev => ({
			...prev,
			[field]: value
		}))
	}, [])

<<<<<<< HEAD
	const setFieldError = useCallback(
		(field: string, error: string | undefined) => {
			setErrors(prev => ({
				...prev,
				[field]: error ? [error] : undefined
			}))
		},
		[]
	)
=======
	const setFieldError = useCallback((field: string, error: string | undefined) => {
		setErrors(prev => ({
			...prev,
			[field]: error ? [error] : undefined
		}))
	}, [])
>>>>>>> origin/main

	return {
		values,
		errors,
		touched,
		isSubmitting,
		handleChange,
		handleBlur,
		validate,
		reset,
		setValue,
		setFieldError,
		setValues,
		setErrors,
		setIsSubmitting
	}
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
