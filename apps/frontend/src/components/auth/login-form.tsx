/**
 * Login Form - Refactored
 * 
 * Modern login form using AuthFormFactory for consistent UX.
 * Eliminates duplication and provides standardized form handling.
 * 
 * Features:
 * - AuthFormFactory integration
 * - Type-safe form handling
 * - Built-in validation and error handling
 * - OAuth integration
 * - Remember me functionality
 */

"use client"

import React from 'react'
import { AuthFormFactory } from './auth-form-factory'
import type { AuthFormState } from '@/lib/actions/auth-actions'

interface LoginFormRefactoredProps {
  redirectTo?: string
  error?: string
  onSuccess?: (result: AuthFormState) => void
}

export function LoginFormRefactored({
  redirectTo,
  error,
  onSuccess
}: LoginFormRefactoredProps) {
  const config = {
    type: 'login' as const,
    title: 'Welcome back',
    description: 'Sign in to access your property dashboard',
    submitLabel: 'Sign in',
    loadingLabel: 'Signing in...',
    redirectTo,
    error
  }

  return <AuthFormFactory config={config} onSuccess={onSuccess} />
}

export default LoginFormRefactored