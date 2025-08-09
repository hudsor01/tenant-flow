/**
 * Refactored Signup Form using Service Layer
 * 
 * This demonstrates how to extract business logic from React components
 * and use the service layer for clean separation of concerns.
 * 
 * BEFORE: Form mixed with authentication logic and validation
 * AFTER: Form focused on UI, service handles business logic
 */

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAuth, usePasswordValidation } from '@/hooks/use-auth-service'
import type { SignUpData } from '@/services'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'

interface SignupFormProps {
  redirectTo?: string
  error?: string
}

interface FormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  companyName: string
}

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  companyName?: string
  general?: string
}

export function SignupFormRefactored({ error }: SignupFormProps) {
  const { signUp, isLoading, error: authError, validateEmail } = useAuth()
  const { validatePassword } = usePasswordValidation()
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  })
  
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Real-time password strength validation
  const passwordStrength = validatePassword(formData.password)
  
  // Client-side validation using service layer
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {}

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    }

    // Email validation using service
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Password validation using service
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (!passwordStrength.isStrong) {
      errors.password = 'Password is not strong enough'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Company name validation (optional)
    if (formData.companyName && formData.companyName.trim().length < 2) {
      errors.companyName = 'Company name must be at least 2 characters when provided'
    }

    return errors
  }, [formData, validateEmail, passwordStrength.isStrong])

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors on change
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    const errors = validateForm()
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return
    }

    // Prepare data for service
    const signUpData: SignUpData = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      companyName: formData.companyName.trim() || undefined,
    }

    // Call service (handles all business logic)
    const result = await signUp(signUpData)
    
    if (result.success) {
      setIsSuccess(true)
    }
    // Error handling is done by the service hook (shows toast, sets error state)
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent you a verification link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Account created! Please check your email to verify your account.
              </p>
            </div>
            
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Start your 14-day free trial today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL error parameter */}
          {error && <AuthError message={error} />}
          
          {/* Service error */}
          {authError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-destructive text-sm">{authError}</p>
              </div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                disabled={isLoading}
                className="h-11"
                aria-invalid={formErrors.fullName ? true : false}
              />
              {formErrors.fullName && (
                <p className="text-sm text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={isLoading}
                className="h-11"
                aria-invalid={formErrors.email ? true : false}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>
            
            {/* Password with Strength Indicator */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isLoading}
                  className="h-11 pr-10"
                  aria-invalid={formErrors.password ? true : false}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength.score} className="h-2 flex-1" />
                    <Badge 
                      variant={passwordStrength.isStrong ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {passwordStrength.score >= 80 ? 'Strong' : 
                       passwordStrength.score >= 60 ? 'Good' : 
                       passwordStrength.score >= 40 ? 'Fair' : 'Weak'}
                    </Badge>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {passwordStrength.feedback.map((feedback: string, index: number) => (
                        <li key={index}>• {feedback}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  disabled={isLoading}
                  className="h-11 pr-10"
                  aria-invalid={formErrors.confirmPassword ? true : false}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Company Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your company name"
                value={formData.companyName}
                onChange={handleInputChange('companyName')}
                disabled={isLoading}
                className="h-11"
                aria-invalid={formErrors.companyName ? true : false}
              />
              {formErrors.companyName && (
                <p className="text-sm text-destructive">{formErrors.companyName}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>

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
          <OAuthProviders disabled={isLoading} />

          {/* Sign in link */}
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}