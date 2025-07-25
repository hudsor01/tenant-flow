import { useForm, type FieldValues, type DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useCallback } from 'react'

/**
 * Generic form validation hook using React Hook Form + Zod
 * Consolidates duplicate form setup patterns across the codebase
 */
export function useFormValidation<T extends FieldValues = FieldValues>(
    schema: z.ZodType<T>,
    defaultValues?: DefaultValues<T>,
    options?: {
        mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
        reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'
    }
) {
    const form = useForm<T>({
        // @ts-expect-error - Zod version compatibility issue with @hookform/resolvers
        resolver: zodResolver(schema),
        defaultValues: defaultValues as DefaultValues<T>,
        mode: options?.mode || 'onChange',
        reValidateMode: options?.reValidateMode || 'onChange'
    })

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isValid, isDirty },
        reset,
        setValue,
        watch,
        trigger,
        clearErrors,
        setError
    } = form

    // Helper to handle form submission with error handling
    const onSubmit = useCallback(
        (handler: (data: T) => Promise<void> | void) => {
            return handleSubmit(async (data) => {
                try {
                    await handler(data as T)
                } catch (error) {
                    console.error('Form submission error:', error)
                    // Could add toast notification here if needed
                }
            })
        },
        [handleSubmit]
    )

    // Helper to reset form with new data
    const resetForm = useCallback(
        (data?: Partial<T>) => {
            reset(data as DefaultValues<T>)
        },
        [reset]
    )

    // Helper to check if field has error
    const hasError = useCallback(
        (fieldName: keyof T) => {
            return !!errors[fieldName]
        },
        [errors]
    )

    // Helper to get field error message
    const getErrorMessage = useCallback(
        (fieldName: keyof T) => {
            return errors[fieldName]?.message as string | undefined
        },
        [errors]
    )

    return {
        // Form control
        register,
        handleSubmit: onSubmit,
        reset: resetForm,
        setValue,
        watch,
        trigger,
        clearErrors,
        setError,

        // Form state
        errors,
        isSubmitting,
        isValid,
        isDirty,

        // Helper functions
        hasError,
        getErrorMessage,

        // Raw form instance for advanced use cases
        form
    }
}