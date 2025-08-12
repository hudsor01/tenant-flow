/**
 * Login Form - Using Supabase UI Components
 * 
 * Simple login form using Supabase's official UI components.
 * Replaces complex custom form with battle-tested authentication.
 * 
 * Features:
 * - Supabase UI integration
 * - Built-in validation and error handling
 * - OAuth providers (Google)
 * - Remember me functionality
 * - Email confirmation support
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