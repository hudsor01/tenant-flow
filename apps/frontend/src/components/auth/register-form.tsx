"use client";

import { useState, useEffect } from "react";
import { useDeferredValue, startTransition } from 'react';
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { 
  cn, 
  buttonClasses, 
  inputClasses, 
  badgeClasses,
  cardClasses,
  formFieldClasses,
  formLabelClasses,
  formErrorClasses,
  animationClasses,
  ANIMATION_DURATIONS
} from "@/lib/utils";
import { useFormWithDraft } from '@/hooks/use-form-draft';
import { authApi } from '@/lib/api-client';

// React 19 2025 Pattern: Native optimization with mount-aware hydration

const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof RegisterSchema>

// Real production registration function
const submitRegister = async (data: RegisterData): Promise<void> => {
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

  // Store tokens in secure storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('refresh_token', response.refresh_token)
  }
}

interface RegisterFormProps {
  onSubmit?: (data: RegisterData) => Promise<void>
  className?: string
}

export function RegisterForm({ onSubmit, className }: RegisterFormProps) {
  // React 19 2025 Pattern: Mount-aware hydration
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // React 19 native form state with backend draft persistence
  const {
    formData,
    updateField,
    handleSubmit,
    isSubmitting,
    submitError,
    isHydrated: _isHydrated,
    draft
  } = useFormWithDraft('signup', onSubmit || submitRegister, {
    email: '',
    name: '',
    password: '',
    confirmPassword: ''
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
    if (!deferredFormData.email && !deferredFormData.name && !deferredFormData.password) {
      setValidationStatus('idle')
      return
    }

    setValidationStatus('validating')
    
    startTransition(() => {
      const result = RegisterSchema.safeParse(deferredFormData)
      
      if (result.success) {
        setValidationErrors({})
        setValidationStatus('valid')
        toast.success("Registration successful!", {
          description: "Welcome to TenantFlow! You can now access your dashboard.",
        })
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
    try {
      await handleSubmit(formData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      console.error('Registration failed:', error)
      toast.error("Registration failed", {
        description: errorMessage,
      })
    }
  }

  // Prevent hydration mismatch with mount check
  if (!mounted) {
    return (
      <div className={cn("flex flex-col gap-8 max-w-md mx-auto", className)}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-base font-medium">Loading form...</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        cardClasses('default'),
        animationClasses('fade-in'),
        "flex flex-col gap-8 max-w-md mx-auto p-6 sm:p-8",
        className
      )}
    >
      {/* React 19 validation status indicator */}
      {validationStatus !== 'idle' && (
        <div 
          className={cn(
            cardClasses('elevated'),
            animationClasses('slide-down'),
            "flex items-center justify-center gap-3 p-4 bg-muted/30"
          )}
        >
          <Badge 
            className={cn(
              badgeClasses(
                validationStatus === 'valid' ? 'success' :
                validationStatus === 'invalid' ? 'destructive' :
                'secondary'
              ),
              'flex items-center gap-2 px-3 py-1.5'
            )}
            style={{
              transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
            }}
          >
            {validationStatus === 'validating' && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {validationStatus === 'valid' && <CheckCircle2 className="h-3 w-3" />}
            {validationStatus === 'invalid' && <AlertCircle className="h-3 w-3" />}
            <span className="font-medium">
              {validationStatus === 'validating' && 'Validating...'}
              {validationStatus === 'valid' && 'Form Valid'}
              {validationStatus === 'invalid' && 'Please Fix Errors'}
            </span>
          </Badge>
          {draft.hasData && (
            <Badge 
              variant="outline" 
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="font-medium">Draft Saved</span>
            </Badge>
          )}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className={cn(formFieldClasses(!!validationErrors.email), animationClasses('slide-up'))}>
          <Label 
            htmlFor="email"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            Email Address
            {formData.email !== deferredFormData.email && (
              <span className="text-xs text-primary animate-pulse">(typing...)</span>
            )}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-required="true"
            aria-describedby={validationErrors.email ? 'email-error' : 'email-help'}
            aria-invalid={!!validationErrors.email}
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
            className={cn(
              inputClasses(validationErrors.email ? 'invalid' : 'default', 'default'),
              "h-11 text-base sm:h-9 sm:text-sm focus:ring-2 focus:ring-offset-1"
            )}
          />
          <p id="email-help" className="text-sm text-muted-foreground leading-relaxed">
            We'll use this email to send you important account updates
          </p>
          {validationErrors.email && (
            <div 
              id="email-error"
              className={cn(
                formErrorClasses(),
                animationClasses('fade-in'),
                "flex items-center gap-2"
              )}
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.email}
            </div>
          )}
        </div>

        <div className={cn(formFieldClasses(!!validationErrors.name), animationClasses('slide-up'))}>
          <Label 
            htmlFor="name"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            Full Name
            {formData.name !== deferredFormData.name && (
              <span className="text-xs text-primary animate-pulse">(typing...)</span>
            )}
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            aria-required="true"
            aria-describedby={validationErrors.name ? 'name-error' : 'name-help'}
            aria-invalid={!!validationErrors.name}
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={isSubmitting}
            className={cn(
              inputClasses(validationErrors.name ? 'invalid' : 'default', 'default'),
              "h-11 text-base sm:h-9 sm:text-sm focus:ring-2 focus:ring-offset-1"
            )}
          />
          <p id="name-help" className="text-sm text-muted-foreground leading-relaxed">
            Enter your first and last name
          </p>
          {validationErrors.name && (
            <div 
              id="name-error"
              className={cn(
                formErrorClasses(),
                animationClasses('fade-in'),
                "flex items-center gap-2"
              )}
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.name}
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
            Password
            {formData.password !== deferredFormData.password && (
              <span className="text-xs text-primary animate-pulse">(typing...)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={validationErrors.password ? 'password-error' : 'password-help'}
              aria-invalid={!!validationErrors.password}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              disabled={isSubmitting}
              className={cn(
                inputClasses(validationErrors.password ? 'invalid' : 'default', 'default'),
                'pr-12 h-11 text-base sm:h-9 sm:text-sm sm:pr-10 focus:ring-2 focus:ring-offset-1'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                buttonClasses('ghost', 'sm'),
                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-foreground",
                "focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p id="password-help" className="text-sm text-muted-foreground leading-relaxed">
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </p>
          {validationErrors.password && (
            <div 
              id="password-error"
              className={cn(
                formErrorClasses(),
                animationClasses('fade-in'),
                "flex items-center gap-2"
              )}
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.password}
            </div>
          )}
        </div>

        <div className={cn(formFieldClasses(!!validationErrors.confirmPassword), animationClasses('slide-up'))}>
          <Label 
            htmlFor="confirmPassword"
            className={cn(
              formLabelClasses(true),
              "flex items-center gap-2"
            )}
          >
            Confirm Password
            {formData.confirmPassword !== deferredFormData.confirmPassword && (
              <span className="text-xs text-primary animate-pulse">(typing...)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : 'confirm-password-help'}
              aria-invalid={!!validationErrors.confirmPassword}
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              disabled={isSubmitting}
              className={cn(
                inputClasses(validationErrors.confirmPassword ? 'invalid' : 'default', 'default'),
                'pr-12 h-11 text-base sm:h-9 sm:text-sm sm:pr-10 focus:ring-2 focus:ring-offset-1'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={cn(
                buttonClasses('ghost', 'sm'),
                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-foreground",
                "focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p id="confirm-password-help" className="text-sm text-muted-foreground leading-relaxed">
            Re-enter your password to confirm it matches
          </p>
          {validationErrors.confirmPassword && (
            <div 
              id="confirm-password-error"
              className={cn(
                formErrorClasses(),
                animationClasses('fade-in'),
                "flex items-center gap-2"
              )}
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              {validationErrors.confirmPassword}
            </div>
          )}
        </div>

        {/* Submission error display */}
        {submitError && (
          <div
            className={cn(
              cardClasses('default'),
              animationClasses('slide-down'),
              "flex items-center gap-3 p-4 text-destructive bg-destructive/5 border-destructive/20"
            )}
            role="alert"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium leading-relaxed">{submitError}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className={cn(
            buttonClasses('primary', 'lg'),
            'w-full font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80',
            'shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isSubmitting && 'scale-95'
          )}
          disabled={isSubmitting || validationStatus === 'invalid'}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 
                className="w-5 h-5 animate-spin" 
                style={{
                  animation: `spin 1s linear infinite`,
                }}
              />
              <span>Creating your account...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Create Account
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}