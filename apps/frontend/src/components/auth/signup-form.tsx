/**
 * Signup Form - Using Supabase UI Components
 * 
 * Simple signup form using Supabase's official UI components.
 * Replaces complex custom form with battle-tested authentication.
 * 
 * Features:
 * - Supabase UI integration
 * - Built-in validation and error handling
 * - OAuth providers (Google)
 * - Email verification flow
 * - Responsive design
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