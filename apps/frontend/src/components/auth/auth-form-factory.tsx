/**
 * Auth Form Factory - Refactored
 * 
 * Unified authentication form factory providing consistent UX across
 * login, signup, and forgot password forms.
 * 
 * Features:
 * - Consistent form structure and styling
 * - Centralized validation and error handling
 * - Built-in loading states and transitions
 * - Accessibility compliance
 * - OAuth integration support
 */

"use client"

import React, { useState, useTransition } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader2, Mail, Lock, Eye, EyeOff, User, Shield, Zap, Users, ArrowLeft, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { loginAction, signupAction, forgotPasswordAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface AuthFormConfig {
  type: 'login' | 'signup' | 'forgot-password'
  title: string
  description: string
  submitLabel: string
  loadingLabel: string
  redirectTo?: string
  error?: string
}

interface AuthFormFactoryProps {
  config: AuthFormConfig
  onSuccess?: (result: AuthFormState) => void
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const _commonValidations = {
  required: (value: string, field: string): string | undefined => {
    return !value?.trim() ? `${field} is required` : undefined
  },
  
  email: (value: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return value && !emailRegex.test(value) ? 'Please enter a valid email address' : undefined
  },
  
  password: (value: string): string | undefined => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) {
      return 'Password must contain at least one uppercase and one lowercase letter'
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'Password must contain at least one number'
    }
    return undefined
  },
  
  confirmPassword: (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password'
    return password !== confirmPassword ? 'Passwords do not match' : undefined
  },

  fullName: (value: string): string | undefined => {
    if (!value?.trim()) return 'Full name is required'
    if (value.trim().length < 2) return 'Full name must be at least 2 characters'
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
      return 'Full name can only contain letters and spaces'
    }
    return undefined
  }
}

// ============================================================================
// FORM FIELD COMPONENTS
// ============================================================================

interface FieldProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  className?: string
  icon?: React.ComponentType<{ className?: string }>
}

function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  error,
  disabled = false,
  className,
  icon: Icon
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            "h-12 text-base transition-all",
            Icon && "pl-10",
            type === 'password' && "pr-10",
            "focus:ring-2 focus:ring-primary/20",
            error && "border-destructive focus:ring-destructive/20",
            className
          )}
          aria-invalid={error ? true : false}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// LOGIN FORM
// ============================================================================

function LoginFormFields({
  state,
  isPending,
  redirectTo
}: {
  state: AuthFormState
  isPending: boolean
  redirectTo?: string
}) {
  const [rememberMe, setRememberMe] = useState(false)

  return (
    <>
      {/* Success message for email confirmation */}
      {redirectTo?.includes('emailConfirmed=true') && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">
            Email confirmed successfully! Please sign in to continue.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <FormField
          label="Email address"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          disabled={isPending}
          error={state.errors?.email?.[0]}
          icon={Mail}
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link 
              href="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              disabled={isPending}
              className={cn(
                "h-12 pl-10 pr-10 text-base transition-all",
                "focus:ring-2 focus:ring-primary/20",
                state.errors?.password && "border-destructive focus:ring-destructive/20"
              )}
              aria-invalid={state.errors?.password ? true : false}
              aria-describedby={state.errors?.password ? 'password-error' : undefined}
            />
          </div>
          {state.errors?.password && (
            <p id="password-error" className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {state.errors.password[0]}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remember" 
            name="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={isPending}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label 
            htmlFor="remember" 
            className="text-sm font-normal cursor-pointer select-none"
          >
            Remember me for 30 days
          </Label>
        </div>

        <input type="hidden" name="redirectTo" value={redirectTo} />
      </div>
    </>
  )
}

// ============================================================================
// SIGNUP FORM
// ============================================================================

function SignupFormFields({
  state,
  isPending,
  redirectTo
}: {
  state: AuthFormState
  isPending: boolean
  redirectTo?: string
}) {
  const [acceptTerms, setAcceptTerms] = useState(false)

  return (
    <>
      <div className="space-y-5">
        <FormField
          label="Full Name"
          name="fullName"
          type="text"
          placeholder="John Doe"
          required
          disabled={isPending}
          error={state.errors?.fullName?.[0]}
          icon={User}
        />

        <FormField
          label="Email Address"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          disabled={isPending}
          error={state.errors?.email?.[0]}
          icon={Mail}
        />
        
        <div className="space-y-2">
          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="Create a secure password"
            required
            disabled={isPending}
            error={state.errors?.password?.[0]}
            icon={Lock}
          />
          <div className="text-xs text-muted-foreground">
            Must be at least 8 characters with a mix of letters and numbers
          </div>
        </div>

        <FormField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
          disabled={isPending}
          error={state.errors?.confirmPassword?.[0]}
          icon={Lock}
        />

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="terms" 
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            disabled={isPending}
            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label 
            htmlFor="terms" 
            className="text-sm font-normal cursor-pointer select-none leading-relaxed"
          >
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:text-primary/80 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:text-primary/80 underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        <input type="hidden" name="redirectTo" value={redirectTo} />
        <input type="hidden" name="acceptTerms" value={acceptTerms.toString()} />
      </div>
    </>
  )
}

// ============================================================================
// FORGOT PASSWORD FORM
// ============================================================================

function ForgotPasswordFormFields({
  state,
  isPending
}: {
  state: AuthFormState
  isPending: boolean
}) {
  return (
    <div className="space-y-5">
      <FormField
        label="Email address"
        name="email"
        type="email"
        placeholder="name@example.com"
        required
        disabled={isPending}
        error={state.errors?.email?.[0]}
        icon={Mail}
      />
      
      {/* Help text */}
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>We'll send you an email with instructions to reset your password.</span>
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// SUCCESS STATES
// ============================================================================

function SignupSuccess({ state }: { state: AuthFormState }) {
  return (
    <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-3xl font-bold">Check Your Email</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          We've sent you a verification link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center">
            {state.message || 'Please check your inbox and click the verification link to complete your registration.'}
          </p>
        </div>
        
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link 
            href="/auth/login" 
            className="text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function ForgotPasswordSuccess({ state }: { state: AuthFormState }) {
  return (
    <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-3xl font-bold">Check Your Email</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          We've sent reset instructions to your inbox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center">
            {state.message || 'Please check your email and follow the instructions to reset your password. The link will expire in 24 hours.'}
          </p>
        </div>
        
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Didn't receive the email? Check your spam folder or try again in a few minutes.</span>
          </p>
        </div>
        
        <div className="text-center text-sm">
          <Link 
            href="/auth/login"
            className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN FACTORY COMPONENT
// ============================================================================

export function AuthFormFactory({ config, onSuccess }: AuthFormFactoryProps) {
  const initialState: AuthFormState = { errors: {} }
  
  // Select the appropriate action based on form type
  const formAction = {
    login: loginAction,
    signup: signupAction,
    'forgot-password': forgotPasswordAction
  }[config.type]
  
  const [state, action] = useActionState(formAction, initialState)
  const [isPending, startTransition] = useTransition()

  // Handle success callback
  React.useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess(state)
    }
  }, [state, onSuccess])

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      action(formData)
    })
  }

  // Show success state for signup and forgot password
  if (state.success) {
    if (config.type === 'signup') {
      return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
          <SignupSuccess state={state} />
        </div>
      )
    }
    
    if (config.type === 'forgot-password') {
      return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
          <ForgotPasswordSuccess state={state} />
        </div>
      )
    }
  }

  // Render form fields based on type
  const renderFormFields = () => {
    switch (config.type) {
      case 'login':
        return <LoginFormFields state={state} isPending={isPending} redirectTo={config.redirectTo} />
      case 'signup':
        return <SignupFormFields state={state} isPending={isPending} redirectTo={config.redirectTo} />
      case 'forgot-password':
        return <ForgotPasswordFormFields state={state} isPending={isPending} />
      default:
        return null
    }
  }

  const showTrustBadges = config.type === 'signup'
  const showOAuth = config.type !== 'forgot-password'
  const showBackLink = config.type === 'forgot-password'

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Trust badges for signup */}
      {showTrustBadges && (
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>Quick Setup</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>10,000+ Users</span>
          </div>
        </div>
      )}

      {/* Security badge for forgot password */}
      {config.type === 'forgot-password' && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure password reset</span>
        </div>
      )}

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {config.title}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL error parameter */}
          {config.error && <AuthError message={config.error} />}
          
          {/* Form validation errors */}
          {state.errors?._form && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-destructive text-sm">
                  {state.errors._form[0]}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form action={handleSubmit} className="space-y-5">
            {renderFormFields()}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium transition-all hover:shadow-lg" 
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {config.loadingLabel}
                </>
              ) : (
                config.submitLabel
              )}
            </Button>
          </form>

          {/* OAuth Section */}
          {showOAuth && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* OAuth Providers */}
              <OAuthProviders disabled={isPending} />
            </>
          )}

          {/* Navigation Links */}
          <div className="text-center text-sm">
            {config.type === 'login' && (
              <>
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </Link>
              </>
            )}
            {config.type === 'signup' && (
              <>
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
            {showBackLink && (
              <Link 
                href="/auth/login"
                className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Sign In
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}