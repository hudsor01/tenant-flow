import { useMemo } from 'react'

export interface PasswordStrength {
  hasMinLength: boolean
  hasUpperCase: boolean
  hasLowerCase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export function usePasswordValidation(password: string) {
  const passwordStrength = useMemo<PasswordStrength>(() => ({
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }), [password])
  
  const isPasswordStrong = useMemo(() => 
    Object.values(passwordStrength).filter(Boolean).length >= 4, 
    [passwordStrength]
  )

  const validatePassword = (confirmPassword?: string) => {
    if (!isPasswordStrong) {
      return 'Please choose a stronger password'
    }
    
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return 'Passwords do not match'
    }
    
    return null
  }

  return {
    passwordStrength,
    isPasswordStrong,
    validatePassword
  }
}