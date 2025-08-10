/**
 * Forgot Password Form - Refactored
 * 
 * Modern forgot password form using AuthFormFactory for consistent UX.
 * Eliminates duplication and provides standardized form handling.
 * 
 * Features:
 * - AuthFormFactory integration
 * - Type-safe form handling with validation
 * - Built-in success state handling
 * - Security indicators
 * - Help text and guidance
 */

"use client"

import React from 'react'
import { AuthFormFactory } from './auth-form-factory'
import type { AuthFormState } from '@/lib/actions/auth-actions'

interface ForgotPasswordFormRefactoredProps {
  error?: string
  onSuccess?: (result: AuthFormState) => void
}

export function ForgotPasswordFormRefactored({
  error,
  onSuccess
}: ForgotPasswordFormRefactoredProps) {
  const config = {
    type: 'forgot-password' as const,
    title: 'Reset your password',
    description: 'Enter your email address and we\'ll send you a secure link to reset your password',
    submitLabel: 'Send Reset Link',
    loadingLabel: 'Sending reset link...',
    error
  }

  return <AuthFormFactory config={config} onSuccess={onSuccess} />
}

export default ForgotPasswordFormRefactored