/**
 * Signup Form - Refactored
 * 
 * Modern signup form using AuthFormFactory for consistent UX.
 * Eliminates duplication and provides standardized form handling.
 * 
 * Features:
 * - AuthFormFactory integration
 * - Type-safe form handling with validation
 * - Built-in success state handling
 * - OAuth integration
 * - Terms acceptance
 * - Trust indicators
 */

"use client"

import React from 'react'
import { AuthFormFactory } from './auth-form-factory'
import type { AuthFormState } from '@/lib/actions/auth-actions'

interface SignupFormRefactoredProps {
  redirectTo?: string
  error?: string
  onSuccess?: (result: AuthFormState) => void
}

export function SignupFormRefactored({
  redirectTo,
  error,
  onSuccess
}: SignupFormRefactoredProps) {
  const config = {
    type: 'signup' as const,
    title: 'Create your account',
    description: 'Start your 14-day free trial • No credit card required',
    submitLabel: 'Create Free Account',
    loadingLabel: 'Creating account...',
    redirectTo,
    error
  }

  return <AuthFormFactory config={config} onSuccess={onSuccess} />
}

export default SignupFormRefactored