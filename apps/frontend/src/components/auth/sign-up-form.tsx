'use client'

import * as React from 'react'
import { useDeferredValue, startTransition, useState, useEffect } from 'react'
import { z } from 'zod'
import { 
  cn,
  buttonClasses,
  inputClasses,
  cardClasses,
  formFieldClasses,
  formLabelClasses,
  formErrorClasses,
  animationClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, AlertCircle, CheckCircle2, Shield, Lock, Mail, User, Building } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { useFormWithDraft } from '@/hooks/use-form-draft'
import { authApi } from '@/lib/api-client'

// React 19 2025 Pattern: Native optimization with mount-aware hydration

// Sign up form validation schema
const SignUpSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

type SignUpData = z.infer<typeof SignUpSchema>

// Real production signup function
const submitSignUp = async (data: SignUpData): Promise<void> => {
  // Parse the full name into first and last name
  const nameParts = data.name.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const response = await authApi.register({
    email: data.email,
    firstName,
    lastName,
    password: data.password
  })

  // Store tokens in secure storage (you might want to use a proper auth store)
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('refresh_token', response.refresh_token)
  }
}

interface SignUpFormProps extends Omit<React.ComponentProps<'div'>, 'onSubmit'> {
  onSubmit?: (data: SignUpData) => Promise<void>
  onLogin?: () => void
  onGoogleSignUp?: () => void | Promise<void>
}

export const SignUpForm = React.forwardRef<HTMLDivElement, SignUpFormProps>(
  ({ className, onSubmit, onLogin, onGoogleSignUp, ...props }, ref) => {
  // React 19 2025 Pattern: Mount-aware hydration
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // React 19 native form state with backend draft persistence
  const {
    formData,
    updateField,
    handleSubmit,
    isSubmitting,
    submitError,
    isHydrated: _isHydrated,
    draft
  } = useFormWithDraft('signup', onSubmit || submitSignUp, {
    name: '',
    email: '',
    password: ''
  })

  // React 19: Deferred values for validation (non-urgent updates)
  const deferredFormData = useDeferredValue(formData)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  // Modern 2025 hydration pattern
  useEffect(() => {
    setMounted(true)
  }, [])

  // React 19: startTransition for non-urgent validation
  useEffect(() => {
    if (!deferredFormData.name && !deferredFormData.email && !deferredFormData.password) {
      setValidationStatus('idle')
      return
    }

    setValidationStatus('validating')
    
    startTransition(() => {
      const result = SignUpSchema.safeParse(deferredFormData)
      
      if (result.success) {
        setValidationErrors({})
        setValidationStatus('valid')
      } else {
        const errors: Record<string, string> = {}
        result.error.issues.forEach((err: { path: unknown[]; message: string }) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        setValidationErrors(errors)
        setValidationStatus('invalid')
      }
    })
  }, [deferredFormData])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSubmit(formData)
  }

  // React Compiler automatically optimizes these handlers
  const handleGoogleSignup = async () => {
    if (onGoogleSignUp) {
      try {
        await onGoogleSignUp()
      } catch (error) {
        console.error('Google signup failed:', error)
      }
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev)
  }

  // Prevent hydration mismatch with mount check
  if (!mounted) {
    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance leading-relaxed">
            Loading form...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={ref} 
      className={cn("flex flex-col gap-8 max-w-md mx-auto", className)}
      style={{ 
        animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
      }}
      {...props}
    >
      {/* Trust Header with Security Indicators */}
      <div 
        className={cn(
          cardClasses('elevated'),
          animationClasses('slide-down'),
          'p-6 text-center space-y-4 border-2 bg-gradient-to-br from-card to-card/50'
        )}
      >
        <div className="flex items-center justify-center gap-2 text-primary">
          <Shield className="w-5 h-5" />
          <span 
            className="font-semibold"
            style={{
              fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
              fontWeight: TYPOGRAPHY_SCALE['body-sm'].fontWeight
            }}
          >
            Secure Registration
          </span>
        </div>
        <h1 
          className="font-bold tracking-tight text-foreground"
          style={{
            fontSize: TYPOGRAPHY_SCALE['display-xl'].fontSize,
            lineHeight: TYPOGRAPHY_SCALE['display-xl'].lineHeight,
            letterSpacing: TYPOGRAPHY_SCALE['display-xl'].letterSpacing,
            fontWeight: TYPOGRAPHY_SCALE['display-xl'].fontWeight
          }}
        >
          Create your account
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building className="w-4 h-4" />
          <p 
            className="leading-relaxed max-w-sm mx-auto"
            style={{
              fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
              lineHeight: TYPOGRAPHY_SCALE['body-md'].lineHeight
            }}
          >
            Join thousands of property managers using TenantFlow
          </p>
        </div>
      </div>

      {/* Enhanced validation status indicator */}
      {validationStatus !== 'idle' && (
        <div 
          className={cn(
            cardClasses('default'),
            animationClasses('slide-down'),
            'flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-muted/30 to-muted/10'
          )}
        >
          <Badge 
            variant={
              validationStatus === 'valid' ? 'default' :
              validationStatus === 'invalid' ? 'destructive' :
              'secondary'
            }
            className="flex items-center gap-2"
          >
            {validationStatus === 'validating' && (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {validationStatus === 'valid' && <CheckCircle2 className="h-3 w-3" />}
            {validationStatus === 'invalid' && <AlertCircle className="h-3 w-3" />}
            <span 
              style={{
                fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize
              }}
            >
              {validationStatus === 'validating' ? 'Validating...' : 
               validationStatus === 'valid' ? 'Ready to submit' :
               'Please check form'}
            </span>
          </Badge>
          {draft.hasData && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Draft Auto-Saved
            </Badge>
          )}
        </div>
      )}
      
      {/* Main Form Container */}
      <div 
        className={cn(
          cardClasses('elevated'),
          animationClasses('fade-in'),
          'border-2 shadow-xl bg-gradient-to-br from-card to-card/80'
        )}
      >
        {onGoogleSignUp && (
          <div className="p-8 pb-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleSignup}
              className={cn(
                buttonClasses('outline', 'lg'),
                'w-full font-medium border-2 relative overflow-hidden group',
                'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-red-50/30',
                'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10',
                'dark:hover:from-blue-900/20 dark:hover:to-red-900/10',
                'transform transition-all hover:scale-[1.02] active:scale-[0.98]',
                'focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100'
              )}
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-center gap-3 relative z-10">
                <div className="transform group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                </div>
                <span 
                  className="group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
                  style={{
                    fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
                    fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
                  }}
                >
                  Continue with Google
                </span>
              </div>
              {/* Hover gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-red-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
            
            {/* Social Login Divider */}
            <div 
              className={cn(
                "relative flex items-center justify-center py-6",
                animationClasses('fade-in')
              )}
            >
              <Separator className="flex-1" />
              <div className="relative flex justify-center">
                <span 
                  className="bg-card px-6 text-muted-foreground font-medium"
                  style={{
                    fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
                    letterSpacing: '0.05em'
                  }}
                >
                  OR CONTINUE WITH EMAIL
                </span>
              </div>
              <Separator className="flex-1" />
            </div>
          </div>
        )}
        
        <form onSubmit={handleFormSubmit} className={cn("space-y-6", onGoogleSignUp ? "px-8 pb-8" : "p-8")}>
        <div className={cn(formFieldClasses(!!validationErrors.name), animationClasses('slide-up'))}>
          <Label 
            htmlFor="name"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            <User className="w-4 h-4 text-primary" />
            Full Name
            {formData.name !== deferredFormData.name && (
              <span className="text-xs text-muted-foreground/60 ml-2 animate-pulse">
                (typing...)
              </span>
            )}
          </Label>
          <Input 
            id="name"
            type="text" 
            placeholder="John Doe" 
            autoComplete="name"
            aria-required
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={isSubmitting}
            className={cn(
              inputClasses(validationErrors.name ? 'invalid' : 'default', 'default'),
              'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
            )}
          />
          <p className="text-sm text-muted-foreground sr-only">
            Enter your full name as it appears on your ID
          </p>
          {validationErrors.name && (
            <div 
              className={cn(
                formErrorClasses(),
                animationClasses('slide-down'),
                "flex items-center gap-2"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.name}
            </div>
          )}
        </div>
        
        <div className={cn(formFieldClasses(!!validationErrors.email), animationClasses('slide-up'))}>
          <Label 
            htmlFor="email"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            <Mail className="w-4 h-4 text-primary" />
            Email address
            {formData.email !== deferredFormData.email && (
              <span className="text-xs text-muted-foreground/60 ml-2 animate-pulse">
                (typing...)
              </span>
            )}
          </Label>
          <Input 
            id="email"
            type="email" 
            placeholder="john@company.com" 
            autoComplete="email"
            aria-required
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
            className={cn(
              inputClasses(validationErrors.email ? 'invalid' : 'default', 'default'),
              'h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
            )}
          />
          <p className="text-sm text-muted-foreground sr-only">
            Enter your business email address
          </p>
          {validationErrors.email && (
            <div 
              className={cn(
                formErrorClasses(),
                animationClasses('slide-down'),
                "flex items-center gap-2"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.email}
            </div>
          )}
        </div>
        
        <div className={cn(formFieldClasses(!!validationErrors.password), animationClasses('slide-up'))}>
          <Label 
            htmlFor="password"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            <Lock className="w-4 h-4 text-primary" />
            Password
            {formData.password !== deferredFormData.password && (
              <span className="text-xs text-muted-foreground/60 ml-2 animate-pulse">
                (typing...)
              </span>
            )}
          </Label>
          <div className="relative">
            <Input 
              id="password"
              type={showPassword ? "text" : "password"} 
              autoComplete="new-password"
              className={cn(
                inputClasses(validationErrors.password ? 'invalid' : 'default', 'default'),
                'pr-10 h-11 text-base transition-all focus:ring-2 focus:ring-offset-1'
              )}
              placeholder="Create a strong password"
              aria-required
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded p-1"
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
              }}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              Must include uppercase, lowercase, number, and special character (8+ chars)
            </p>
          </div>
          {validationErrors.password && (
            <div 
              className={cn(
                formErrorClasses(),
                animationClasses('slide-down'),
                "flex items-center gap-2"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.password}
            </div>
          )}
        </div>
        
        {/* Submission error display */}
        {submitError && (
          <div
            className={cn(
              cardClasses('elevated'),
              animationClasses('slide-down'),
              'flex items-center gap-3 p-4 border-2 text-red-700 bg-red-50 border-red-300',
              'dark:text-red-400 dark:bg-red-900/20 dark:border-red-600'
            )}
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span 
              className="font-medium leading-relaxed"
              style={{
                fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
              }}
            >
              {submitError}
            </span>
          </div>
        )}
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          size="lg"
          className={cn(
            buttonClasses('primary', 'lg'),
            'w-full font-semibold bg-gradient-to-r from-primary via-primary to-primary/90',
            'hover:from-primary/90 hover:via-primary/95 hover:to-primary/80',
            'shadow-lg hover:shadow-xl active:shadow-md',
            'transform transition-all hover:scale-[1.02] active:scale-[0.98]',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
            isSubmitting && 'animate-pulse'
          )}
          disabled={isSubmitting || validationStatus === 'invalid'}
          style={{
            transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
          }}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <CheckCircle2 className="w-5 h-5 animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30 animate-spin" />
              </div>
              <span 
                style={{
                  fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
                  fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
                }}
              >
                Creating your account...
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              <span 
                style={{
                  fontSize: TYPOGRAPHY_SCALE['body-md'].fontSize,
                  fontWeight: TYPOGRAPHY_SCALE['body-md'].fontWeight
                }}
              >
                Create Account
              </span>
            </div>
          )}
        </Button>
      </form>
      </div>
      
      {/* Footer Section */}
      <div 
        className={cn(
          cardClasses('default'),
          animationClasses('fade-in'),
          'text-center p-6 bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50'
        )}
      >
        <div className="space-y-4">
          <p 
            className="text-muted-foreground"
            style={{
              fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
              lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
            }}
          >
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLogin}
              className={cn(
                "text-primary hover:text-primary/80 underline underline-offset-4 font-semibold transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
              )}
              style={{
                transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
              }}
            >
              Sign in
            </button>
          </p>
          
          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground/75">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-600" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-600" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span>GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
SignUpForm.displayName = 'SignUpForm'