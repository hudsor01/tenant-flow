'use client'

import * as React from 'react'
import { useDeferredValue, startTransition, useState, useEffect } from 'react'
import { z } from 'zod'
import { 
  cn
} from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
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
    <div ref={ref} className={cn("space-y-6", className)} {...props}>

      {/* React 19 validation status indicator */}
      {validationStatus !== 'idle' && (
        <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Badge variant={
            validationStatus === 'valid' ? 'default' :
            validationStatus === 'invalid' ? 'destructive' :
            'secondary'
          }>
            {validationStatus === 'validating' && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />}
            {validationStatus === 'valid' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {validationStatus === 'invalid' && <AlertCircle className="h-3 w-3 mr-1" />}
            Validation: {validationStatus}
          </Badge>
          {draft.hasData && (
            <Badge variant="outline">
              Draft Saved
            </Badge>
          )}
        </div>
      )}
      
      {onGoogleSignUp && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignup}
            className="w-full transition-all duration-200 hover:bg-gray-50 border-gray-200"
            disabled={isSubmitting}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </>
      )}
      
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name *
            {formData.name !== deferredFormData.name && (
              <span className="text-xs text-gray-400 ml-2">(typing...)</span>
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
          />
          <p className="text-sm text-muted-foreground sr-only">
            Enter your full name
          </p>
          {validationErrors.name && (
            <div className="text-sm text-red-600">{validationErrors.name}</div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">
            Email *
            {formData.email !== deferredFormData.email && (
              <span className="text-xs text-gray-400 ml-2">(typing...)</span>
            )}
          </Label>
          <Input 
            id="email"
            type="email" 
            placeholder="m@example.com" 
            autoComplete="email"
            aria-required
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-sm text-muted-foreground sr-only">
            Enter your email address
          </p>
          {validationErrors.email && (
            <div className="text-sm text-red-600">{validationErrors.email}</div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">
            Password *
            {formData.password !== deferredFormData.password && (
              <span className="text-xs text-gray-400 ml-2">(typing...)</span>
            )}
          </Label>
          <div className="relative">
            <Input 
              id="password"
              type={showPassword ? "text" : "password"} 
              autoComplete="new-password"
              className="pr-10"
              placeholder="Create a strong password"
              aria-required
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </p>
          {validationErrors.password && (
            <div className="text-sm text-red-600">{validationErrors.password}</div>
          )}
        </div>
        
        {/* Submission error display */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {submitError}
          </div>
        )}
        
        <Button 
          type="submit" 
          className="w-full transition-all duration-200 shadow-sm hover:shadow-md"
          disabled={isSubmitting || validationStatus === 'invalid'}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      
      <div className="text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onLogin}
          className="underline underline-offset-4 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
        >
          Sign in
        </button>
      </div>
    </div>
  )
})
SignUpForm.displayName = 'SignUpForm'