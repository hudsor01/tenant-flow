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
import { SupabaseLoginForm } from './forms/supabase-login-form'

interface LoginFormRefactoredProps {
  redirectTo?: string
}

export function LoginFormRefactored({
  redirectTo = '/dashboard'
}: LoginFormRefactoredProps) {
  return (
    <SupabaseLoginForm
      redirectTo={redirectTo}
      className="w-full"
    />
  )
}

export default LoginFormRefactored