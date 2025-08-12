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
import { CheckCircle, AlertCircle, Mail, Lock, Eye, EyeOff, User, Shield, ArrowLeft, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { loginAction, signupAction, forgotPasswordAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'
import { SignupProgressIndicator } from './signup-progress-indicator'
import { PasswordStrengthIndicator } from './password-strength-indicator'
import { RealTimeValidation } from './real-time-validation'
import { EnhancedVisualFeedback, FieldFeedback } from './enhanced-visual-feedback'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors duration-200" />
        )}
        <Input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            "h-12 text-base transition-all duration-300 ease-in-out",
            Icon && "pl-10",
            type === 'password' && "pr-10",
            "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:scale-[1.02] hover:border-gray-400",
            "border-2 border-gray-200",
            error && "border-red-400 focus:ring-red-500/30 focus:border-red-500",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
          aria-invalid={error ? true : false}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-all duration-200 hover:scale-110 active:scale-95 rounded-full p-1 hover:bg-blue-50"
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
        <div className="animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <p id={`${name}-error`} className="text-sm text-red-600 flex items-center gap-2 mt-1.5 bg-red-50 border border-red-200 rounded-md p-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </p>
        </div>
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
              className="text-sm text-blue-600 hover:text-blue-700 transition-all duration-200 hover:underline hover:underline-offset-2"
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
                "h-12 pl-10 pr-10 text-base transition-all duration-300 ease-in-out",
                "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:scale-[1.02] hover:border-gray-400",
                "border-2 border-gray-200",
                state.errors?.password && "border-red-400 focus:ring-red-500/30 focus:border-red-500"
              )}
              aria-invalid={state.errors?.password ? true : false}
              aria-describedby={state.errors?.password ? 'password-error' : undefined}
            />
          </div>
          {state.errors?.password && (
            <div className="animate-in fade-in-50 slide-in-from-top-1 duration-200">
              <p id="password-error" className="text-sm text-red-600 flex items-center gap-2 mt-1.5 bg-red-50 border border-red-200 rounded-md p-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="font-medium">{state.errors.password[0]}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 group">
          <Checkbox 
            id="remember" 
            name="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            disabled={isPending}
            className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-all duration-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
          />
          <Label 
            htmlFor="remember" 
            className="text-sm font-normal text-gray-700 cursor-pointer select-none transition-colors duration-200 hover:text-blue-600 group-hover:text-blue-600"
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
  redirectTo,
  onFormValidChange
}: {
  state: AuthFormState
  isPending: boolean
  redirectTo?: string
  onFormValidChange?: (isValid: boolean) => void
}) {
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  // Real-time validators
  const validateEmail = async (email: string) => {
    if (!email) return { isValid: false, message: 'Email is required' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' }
    }
    // Simulate API check for existing email
    await new Promise(resolve => setTimeout(resolve, 300))
    return { isValid: true, message: 'Email looks good!' }
  }

  const validateFullName = async (name: string) => {
    if (!name?.trim()) return { isValid: false, message: 'Full name is required' }
    if (name.trim().length < 2) return { isValid: false, message: 'Name must be at least 2 characters' }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return { isValid: false, message: 'Name can only contain letters and spaces' }
    }
    return { isValid: true, message: 'Name looks great!' }
  }

  const handleFieldChange = (field: string, value: string) => {
    console.log(`📝 Field ${field} changed to:`, value)
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Check if form is valid
  React.useEffect(() => {
    const isEmailValid = formData.email.includes('@') && formData.email.includes('.')
    const isPasswordValid = formData.password.length >= 8
    const isPasswordMatch = formData.confirmPassword === formData.password && formData.confirmPassword.length > 0
    const isNameValid = formData.fullName.trim().length >= 2
    
    const isValid = isNameValid && isEmailValid && isPasswordValid && isPasswordMatch && acceptTerms
    
    console.log('📋 Form validation details:', {
      formData,
      acceptTerms,
      checks: {
        isNameValid,
        isEmailValid,
        isPasswordValid,
        isPasswordMatch
      },
      finalIsValid: isValid
    })
    
    onFormValidChange?.(isValid)
  }, [formData, acceptTerms, onFormValidChange])

  return (
    <>
      {/* Progress Indicator */}
      <SignupProgressIndicator currentStep={0} className="mb-6" />
      
      {/* Enhanced Visual Feedback for Form Status */}
      {state.errors?._form && (
        <EnhancedVisualFeedback
          type="error"
          message={state.errors._form[0]}
          animation="shake"
          className="mb-4"
        />
      )}

      <div className="space-y-5">
        {/* Enhanced Real-Time Validation for Full Name */}
        <RealTimeValidation
          id="fullName"
          name="fullName"
          label="Full Name"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={(value) => handleFieldChange('fullName', value)}
          validator={validateFullName}
          required
          disabled={isPending}
          icon={User}
        />

        {/* Enhanced Real-Time Validation for Email */}
        <RealTimeValidation
          id="email"
          name="email"
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={(value) => handleFieldChange('email', value)}
          validator={validateEmail}
          required
          disabled={isPending}
          icon={Mail}
        />
        
        {/* Enhanced Password Field with Strength Indicator */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors duration-200" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
                disabled={isPending}
                className={cn(
                  "h-12 text-base transition-all duration-300 ease-in-out pl-10",
                  "border-2 border-gray-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
                  state.errors?.password && "border-red-400 focus:ring-red-500/30 focus:border-red-500"
                )}
                aria-invalid={state.errors?.password ? true : false}
                aria-describedby={state.errors?.password ? 'password-error' : undefined}
              />
            </div>
            
            {/* Field Feedback for Password */}
            <FieldFeedback
              isValid={state.errors?.password ? false : formData.password ? true : null}
              error={state.errors?.password?.[0]}
              className="mt-2"
            />
          </div>
          
          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator 
            password={formData.password} 
            className="mt-3"
          />
        </div>

        {/* Progressive Disclosure - Show confirm password always, but with improved logic */}
        {(formData.password.length > 0 || showOptionalFields) && (
          <div className="animate-in fade-in-50 slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors duration-200" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  required
                  disabled={isPending}
                  className={cn(
                    "h-12 text-base transition-all duration-300 ease-in-out pl-10",
                    "border-2 border-gray-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
                    state.errors?.confirmPassword && "border-red-400 focus:ring-red-500/30 focus:border-red-500"
                  )}
                  aria-invalid={state.errors?.confirmPassword ? true : false}
                  aria-describedby={state.errors?.confirmPassword ? 'confirmPassword-error' : undefined}
                />
              </div>
              
              {/* Field Feedback for Confirm Password */}
              <FieldFeedback
                isValid={
                  state.errors?.confirmPassword ? false : 
                  formData.confirmPassword && formData.password === formData.confirmPassword ? true : null
                }
                error={state.errors?.confirmPassword?.[0]}
                success={formData.confirmPassword && formData.password === formData.confirmPassword ? "Passwords match!" : undefined}
                className="mt-2"
              />
            </div>
          </div>
        )}
        
        {/* Show all fields button - only when no password is entered */}
        {!showOptionalFields && formData.password.length === 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOptionalFields(true)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
          >
            Show all fields
          </Button>
        )}

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

        {/* Hidden fields for redirect and terms acceptance */}
        <input type="hidden" name="redirectTo" value={redirectTo || ''} />
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
  const [isSignupFormValid, setIsSignupFormValid] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Ensure client-side hydration
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Debug the form validation state changes
  React.useEffect(() => {
    console.log('🎯 isSignupFormValid changed to:', isSignupFormValid)
  }, [isSignupFormValid])
  
  // Select the appropriate action based on form type
  const formAction = {
    login: loginAction,
    signup: signupAction,
    'forgot-password': forgotPasswordAction
  }[config.type]
  
  const [state, action] = useActionState(formAction, initialState)
  const [isPending, _startTransition] = useTransition()

  const isFormValid = () => {
    if (config.type === 'signup') {
      console.log('🔍 Form validation check:', {
        isSignupFormValid,
        configType: config.type
      })
      return isSignupFormValid
    }
    return true
  }

  // Handle success and error feedback
  React.useEffect(() => {
    if (state.success) {
      // Success toast notifications
      if (config.type === 'login') {
        toast.success('Welcome back!', {
          description: 'You have been signed in successfully.',
        })
        
        // Client-side redirect for login after successful authentication
        setTimeout(() => {
          window.location.href = config.redirectTo || '/dashboard'
        }, 500) // Small delay to let session cookies settle
        
      } else if (config.type === 'signup') {
        toast.success('Account created!', {
          description: 'Please check your email to verify your account.',
        })
        
        // Redirect to email verification page or login after signup
        setTimeout(() => {
          window.location.href = '/auth/verify-email?email=' + encodeURIComponent(state.data?.user?.email || '')
        }, 1500) // Give user time to see the success message
        
      } else if (config.type === 'forgot-password') {
        toast.success('Reset email sent!', {
          description: 'Check your inbox for password reset instructions.',
        })
      }
      
      if (onSuccess) {
        onSuccess(state)
      }
    } else if (state.errors?._form && !isPending) {
      // Error toast for general form errors
      toast.error('Authentication Error', {
        description: state.errors._form[0],
      })
    }
  }, [state, onSuccess, config.type, isPending, config.redirectTo])

  // Debug function for form submission
  const debugFormSubmission = () => {
    console.log('🔥 FORM SUBMIT BUTTON CLICKED', {
      isClient,
      isPending,
      isFormValid: config.type === 'signup' ? isFormValid() : true,
      disabled: !isClient || isPending || (config.type === 'signup' && !isFormValid())
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
        return <SignupFormFields state={state} isPending={isPending} redirectTo={config.redirectTo} onFormValidChange={setIsSignupFormValid} />
      case 'forgot-password':
        return <ForgotPasswordFormFields state={state} isPending={isPending} />
      default:
        return null
    }
  }

  const showOAuth = config.type !== 'forgot-password'
  const showBackLink = config.type === 'forgot-password'

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Security badge for forgot password */}
      {config.type === 'forgot-password' && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure password reset</span>
        </div>
      )}

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-accent/1 to-success/2" />
        
        <CardHeader className="space-y-2 pb-8 relative">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 bg-clip-text text-transparent">
            {config.title}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground leading-relaxed">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 relative">
          {/* URL error parameter */}
          {config.error && <AuthError message={config.error} />}
          
          {/* Form validation errors */}
          {state.errors?._form && (
            <div className="animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-1 bg-red-100 rounded-full">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-800 text-sm font-medium">
                      {state.errors._form[0]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form action={action} className="space-y-5">
            {renderFormFields()}

            <Button 
              type="submit" 
              variant="premium"
              size="lg"
              className="w-full h-12 text-base font-semibold group relative overflow-hidden" 
              disabled={!isClient || isPending || (config.type === 'signup' && !isFormValid())}
              onClick={debugFormSubmission}
            >
              {isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  <span className="animate-pulse">{config.loadingLabel}</span>
                </div>
              ) : (
                <>
                  <span className="transition-all duration-200">{config.submitLabel}</span>
                  <div className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </div>
                </>
              )}
              
              {/* Enhanced button shimmer effect */}
              <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" />
            </Button>
          </form>

          {/* OAuth Section */}
          {showOAuth && (
            <OAuthProviders 
              disabled={isPending}
            />
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