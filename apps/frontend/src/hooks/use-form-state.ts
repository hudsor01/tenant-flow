import { useState } from 'react'

export interface FormState {
  email: string
  password: string
  confirmPassword: string
  name: string
  showPassword: boolean
  showConfirmPassword: boolean
  agreedToTerms: boolean
}

const initialFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  showPassword: false,
  showConfirmPassword: false,
  agreedToTerms: false
}

export function useFormState() {
  const [formState, setFormState] = useState<FormState>(initialFormState)

  const updateField = <K extends keyof FormState>(
    field: K, 
    value: FormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = () => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }

  const toggleConfirmPasswordVisibility = () => {
    setFormState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))
  }

  const resetForm = () => {
    setFormState(initialFormState)
  }

  const getFormData = () => ({
    name: formState.name,
    email: formState.email,
    password: formState.password,
    confirmPassword: formState.confirmPassword,
    agreedToTerms: formState.agreedToTerms
  })

  return {
    formState,
    updateField,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    resetForm,
    getFormData
  }
}