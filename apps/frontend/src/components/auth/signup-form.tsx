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
import { SupabaseSignupForm } from './forms/supabase-signup-form'

interface SignupFormRefactoredProps {
  redirectTo?: string
}

export function SignupFormRefactored({
  redirectTo = '/dashboard'
}: SignupFormRefactoredProps) {
  return (
    <SupabaseSignupForm
      redirectTo={redirectTo}
      className="w-full"
    />
  )
}

export default SignupFormRefactored