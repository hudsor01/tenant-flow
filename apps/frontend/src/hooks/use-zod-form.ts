import { useState, useCallback, useMemo } from 'react'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'

/**
 * Zod Form Validation Hook
 * Provides seamless integration between Zod schemas and React forms
 */

interface UseZodFormOptions<T> {
	schema: ZodSchema<T>
	initialValues?: Partial<T>
	onSubmit?: (data: T) => Promise<void> | void
	validateOnChange?: boolean
	validateOnBlur?: boolean
}

interface FormError {
	field: string
	message: string
	code: string
}

interface UseZodFormReturn<T> {
	values: Partial<T>
	errors: Record<string, string>
	touched: Record<string, boolean>
	isValid: boolean
	isSubmitting: boolean
	isDirty: boolean

	// Field operations
	setValue: (field: keyof T, value: T[keyof T]) => void
	setValues: (values: Partial<T>) => void
	setError: (field: keyof T, message: string) => void
	setErrors: (errors: Record<string, string>) => void
	clearError: (field: keyof T) => void
	clearErrors: () => void

	// Form operations
	validateField: (field: keyof T) => boolean
	validateForm: () => boolean
	reset: (values?: Partial<T>) => void
	handleSubmit: (
		onSubmit?: (data: T) => Promise<void> | void
	) => (e?: React.FormEvent) => Promise<void>

	// Field handlers
	getFieldProps: (field: keyof T) => {
		name: string
		value: unknown
		onChange: (
			e: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>
		) => void
		onBlur: (
			e: React.FocusEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>
		) => void
		error?: string
		'aria-invalid'?: boolean
		'aria-describedby'?: string
	}

	// Utilities
	formatZodError: (error: ZodError) => FormError[]
	safeValidate: (
		data: unknown
	) => { success: true; data: T } | { success: false; errors: FormError[] }
}

export function useZodForm<T extends Record<string, unknown>>({
	schema,
	initialValues = {},
	onSubmit,
	validateOnChange = false,
	validateOnBlur = true
}: UseZodFormOptions<T>): UseZodFormReturn<T> {
	const [values, setValuesState] = useState<Partial<T>>(initialValues)
	const [errors, setErrorsState] = useState<Record<string, string>>({})
	const [touched, setTouchedState] = useState<Record<string, boolean>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Derived state
	const isDirty = useMemo(() => {
		return Object.keys(values).some(
			key => values[key as keyof T] !== initialValues[key as keyof T]
		)
	}, [values, initialValues])

	const isValid = useMemo(() => {
		const result = schema.safeParse(values)
		return result.success && Object.keys(errors).length === 0
	}, [schema, values, errors])

	// Utility functions
	const formatZodError = useCallback((error: ZodError): FormError[] => {
		return error.issues.map(err => ({
			field: err.path.join('.'),
			message: err.message,
			code: err.code
		}))
	}, [])

	const safeValidate = useCallback(
		(data: unknown) => {
			const result = schema.safeParse(data)

			if (result.success) {
				return { success: true as const, data: result.data }
			}

			return {
				success: false as const,
				errors: formatZodError(result.error)
			}
		},
		[schema, formatZodError]
	)

	// Field operations
	const setValue = useCallback(
		(field: keyof T, value: T[keyof T]) => {
			setValuesState(prev => ({ ...prev, [field]: value }))

			if (validateOnChange) {
				// Validate single field
				try {
					const fieldSchema = (
						schema as unknown as {
							_def: { shape: Record<string, ZodSchema> }
						}
					)._def?.shape?.[field as string]
					if (fieldSchema) {
						fieldSchema.parse(value)
						setErrorsState(prev => {
							const newErrors = { ...prev }
							delete newErrors[field as string]
							return newErrors
						})
					}
				} catch (error) {
					if (error instanceof ZodError) {
						const formattedErrors = formatZodError(error)
						const firstError = formattedErrors[0]
						if (firstError) {
							setErrorsState(prev => ({
								...prev,
								[field as string]: firstError.message
							}))
						}
					}
				}
			}
		},
		[schema, validateOnChange, formatZodError]
	)

	const setValues = useCallback((newValues: Partial<T>) => {
		setValuesState(prev => ({ ...prev, ...newValues }))
	}, [])

	const setError = useCallback((field: keyof T, message: string) => {
		setErrorsState(prev => ({ ...prev, [field as string]: message }))
	}, [])

	const setErrors = useCallback((newErrors: Record<string, string>) => {
		setErrorsState(newErrors)
	}, [])

	const clearError = useCallback((field: keyof T) => {
		setErrorsState(prev => {
			const newErrors = { ...prev }
			delete newErrors[field as string]
			return newErrors
		})
	}, [])

	const clearErrors = useCallback(() => {
		setErrorsState({})
	}, [])

	// Form operations
	const validateField = useCallback(
		(field: keyof T): boolean => {
			try {
				// Get the field schema if it's an object schema
				const fieldSchema = (
					schema as unknown as {
						_def: { shape?: Record<string, ZodSchema> }
					}
				)._def?.shape?.[field as string]

				if (fieldSchema) {
					// Validate just this field's value
					fieldSchema.parse(values[field])
					clearError(field)
					return true
				} else {
					// Fallback: validate entire form but only report errors for this field
					const result = schema.safeParse(values)

					if (!result.success) {
						const fieldError = result.error.issues.find(
							issue => issue.path[0] === field
						)

						if (fieldError) {
							setError(field, fieldError.message)
							return false
						}
					}

					clearError(field)
					return true
				}
			} catch (error) {
				if (error instanceof ZodError) {
					const formattedErrors = formatZodError(error)
					const firstError = formattedErrors[0]
					if (firstError) {
						setError(field, firstError.message)
					}
				}
				return false
			}
		},
		[schema, values, clearError, setError, formatZodError]
	)

	const validateForm = useCallback((): boolean => {
		const result = safeValidate(values)

		if (result.success) {
			clearErrors()
			return true
		}

		const fieldErrors: Record<string, string> = {}
		result.errors.forEach(error => {
			fieldErrors[error.field] = error.message
		})
		setErrors(fieldErrors)
		return false
	}, [values, safeValidate, clearErrors, setErrors])

	const reset = useCallback(
		(resetValues?: Partial<T>) => {
			const newValues = resetValues || initialValues
			setValuesState(newValues)
			setErrorsState({})
			setTouchedState({})
			setIsSubmitting(false)
		},
		[initialValues]
	)

	const handleSubmit = useCallback(
		(submitFn?: (data: T) => Promise<void> | void) => {
			return async (_e?: React.FormEvent) => {
				_e?.preventDefault()

				if (isSubmitting) return

				setIsSubmitting(true)

				try {
					const isFormValid = validateForm()

					if (isFormValid) {
						const validatedData = schema.parse(values)
						const submitFunction = submitFn || onSubmit

						if (submitFunction) {
							await submitFunction(validatedData)
						}
					}
				} catch (error) {
					if (error instanceof ZodError) {
						const formattedErrors = formatZodError(error)
						const fieldErrors: Record<string, string> = {}
						formattedErrors.forEach(err => {
							fieldErrors[err.field] = err.message
						})
						setErrors(fieldErrors)
					}
					throw error
				} finally {
					setIsSubmitting(false)
				}
			}
		},
		[
			isSubmitting,
			validateForm,
			schema,
			values,
			onSubmit,
			formatZodError,
			setErrors
		]
	)

	// Field handlers
	const getFieldProps = useCallback(
		(field: keyof T) => {
			const fieldName = field as string
			const hasError = !!errors[fieldName]

			return {
				name: fieldName,
				value: values[field] ?? '',
				onChange: (
					e: React.ChangeEvent<
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
					>
				) => {
					setValue(field, e.target.value as T[keyof T])
				},
				onBlur: (
					_e: React.FocusEvent<
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
					>
				) => {
					setTouchedState(prev => ({ ...prev, [fieldName]: true }))

					if (validateOnBlur) {
						validateField(field)
					}
				},
				error: errors[fieldName],
				'aria-invalid': hasError,
				'aria-describedby': hasError ? `${fieldName}-error` : undefined
			}
		},
		[values, errors, setValue, validateOnBlur, validateField]
	)

	return {
		values,
		errors,
		touched,
		isValid,
		isSubmitting,
		isDirty,
		setValue,
		setValues,
		setError,
		setErrors,
		clearError,
		clearErrors,
		validateField,
		validateForm,
		reset,
		handleSubmit,
		getFieldProps,
		formatZodError,
		safeValidate
	}
}

/**
 * Hook for async form validation with debouncing
 */
export function useZodFormAsync<T extends Record<string, unknown>>({
	schema,
	initialValues = {},
	onSubmit,
	validateOnChange = false,
	validateOnBlur = true,
	debounceMs = 300,
	asyncValidator
}: UseZodFormOptions<T> & {
	debounceMs?: number
	asyncValidator?: (data: T) => Promise<Record<string, string> | null>
}): UseZodFormReturn<T> & {
	isValidating: boolean
} {
	const form = useZodForm({
		schema,
		initialValues,
		onSubmit,
		validateOnChange,
		validateOnBlur
	})
	const [isValidating, setIsValidating] = useState(false)

	const debouncedValidate = useMemo(() => {
		let timeoutId: NodeJS.Timeout

		return (data: T) => {
			clearTimeout(timeoutId)
			setIsValidating(true)

			timeoutId = setTimeout(async () => {
				try {
					if (asyncValidator) {
						const asyncErrors = await asyncValidator(data)
						if (asyncErrors) {
							form.setErrors(asyncErrors)
						}
					}
				} catch (error) {
					console.error('Async validation error:', error)
				} finally {
					setIsValidating(false)
				}
			}, debounceMs)
		}
	}, [asyncValidator, debounceMs, form])

	// Override setValue to trigger async validation
	const setValue = useCallback(
		(field: keyof T, value: T[keyof T]) => {
			form.setValue(field, value)

			if (validateOnChange && asyncValidator) {
				const newValues = { ...form.values, [field]: value } as T
				debouncedValidate(newValues)
			}
		},
		[form, validateOnChange, asyncValidator, debouncedValidate]
	)

	return {
		...form,
		setValue,
		isValidating
	}
}
