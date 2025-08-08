"use client"

import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from './password-input'
import { PasswordStrengthIndicator } from './password-strength-indicator'
import { ErrorDisplay } from './error-display'
import { GoogleSignupButton } from './google-signup-button'
import { usePasswordValidation } from '@/hooks/use-password-validation'
import type { FormState } from '@/hooks/use-form-state'

interface SignupFormFieldsProps {
  formState: FormState
  onFieldUpdate: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  onTogglePasswordVisibility: () => void
  onToggleConfirmPasswordVisibility: () => void
  onEmailSubmit: (e: React.FormEvent) => void
  onGoogleSignup: () => void
  isLoading: boolean
  error: string | null
}

export function SignupFormFields({
  formState,
  onFieldUpdate,
  onTogglePasswordVisibility,
  onToggleConfirmPasswordVisibility,
  onEmailSubmit,
  onGoogleSignup,
  isLoading,
  error
}: SignupFormFieldsProps) {
  const { passwordStrength, validatePassword } = usePasswordValidation(formState.password)
  const passwordError = validatePassword(formState.confirmPassword)

  return (
    <>
      <ErrorDisplay error={error} />
      
      <form onSubmit={onEmailSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formState.name}
            onChange={e => onFieldUpdate('name', e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={formState.email}
            onChange={e => onFieldUpdate('email', e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>
        
        <div className="space-y-2">
          <PasswordInput
            id="password"
            label="Password"
            placeholder="Create a strong password"
            value={formState.password}
            showPassword={formState.showPassword}
            onValueChange={(value) => onFieldUpdate('password', value)}
            onToggleVisibility={onTogglePasswordVisibility}
            required
            disabled={isLoading}
          />
          
          <PasswordStrengthIndicator 
            password={formState.password}
            passwordStrength={passwordStrength}
          />
        </div>
        
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formState.confirmPassword}
          showPassword={formState.showConfirmPassword}
          onValueChange={(value) => onFieldUpdate('confirmPassword', value)}
          onToggleVisibility={onToggleConfirmPasswordVisibility}
          required
          disabled={isLoading}
          error={formState.confirmPassword && formState.password !== formState.confirmPassword ? "Passwords do not match" : null}
        />

        <div className="flex items-start space-x-2">
          <Checkbox 
            id="terms" 
            checked={formState.agreedToTerms}
            onCheckedChange={(checked) => onFieldUpdate('agreedToTerms', checked as boolean)}
            disabled={isLoading}
            className="mt-1"
          />
          <Label 
            htmlFor="terms" 
            className="text-sm font-normal cursor-pointer leading-relaxed"
          >
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !formState.agreedToTerms || !!passwordError}
          className="w-full h-11"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

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

      {/* Social Signup */}
      <GoogleSignupButton 
        onSignup={onGoogleSignup}
        isLoading={isLoading}
        disabled={isLoading}
      />

      {/* Sign in link */}
      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link 
          href="/auth/login" 
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    </>
  )
}