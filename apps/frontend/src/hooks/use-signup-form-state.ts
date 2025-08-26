/**
 * Signup Form State Hook
 * Manages state for signup forms with all necessary fields
 */
import { useState, useCallback } from 'react'

export interface SignupFormState {
	name: string
	email: string
	password: string
	confirmPassword: string
	agreedToTerms: boolean
	showPassword: boolean
	showConfirmPassword: boolean
	isLoading: boolean
	error: string | null
	success: boolean
}

export function useSignupFormState() {
	const [formState, setFormState] = useState<SignupFormState>({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		agreedToTerms: false,
		showPassword: false,
		showConfirmPassword: false,
		isLoading: false,
		error: null,
		success: false
	})

<<<<<<< HEAD
	const updateField = useCallback(
		<K extends keyof SignupFormState>(
			field: K,
			value: SignupFormState[K]
		) => {
			setFormState(prev => ({
				...prev,
				[field]: value
			}))
		},
		[]
	)
=======
	const updateField = useCallback(<K extends keyof SignupFormState>(
		field: K,
		value: SignupFormState[K]
	) => {
		setFormState(prev => ({
			...prev,
			[field]: value
		}))
	}, [])
>>>>>>> origin/main

	const togglePasswordVisibility = useCallback(() => {
		setFormState(prev => ({
			...prev,
			showPassword: !prev.showPassword
		}))
	}, [])

	const toggleConfirmPasswordVisibility = useCallback(() => {
		setFormState(prev => ({
			...prev,
			showConfirmPassword: !prev.showConfirmPassword
		}))
	}, [])

	const getFormData = useCallback(() => {
		return {
			name: formState.name,
			email: formState.email,
			password: formState.password,
			confirmPassword: formState.confirmPassword,
			agreedToTerms: formState.agreedToTerms
		}
	}, [formState])

	const reset = useCallback(() => {
		setFormState({
			name: '',
			email: '',
			password: '',
			confirmPassword: '',
			agreedToTerms: false,
			showPassword: false,
			showConfirmPassword: false,
			isLoading: false,
			error: null,
			success: false
		})
	}, [])

	return {
		formState,
		updateField,
		togglePasswordVisibility,
		toggleConfirmPasswordVisibility,
		getFormData,
		reset,
		setFormState
	}
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
