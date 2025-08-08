'use client'

import { useTransition, useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, User, Mail, Lock, Eye, EyeOff, Loader2, Shield, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

interface SignupFormProps {
  redirectTo?: string
  error?: string
}

const initialState: AuthFormState = {
  errors: {},
}

export function SignupForm({ redirectTo, error }: SignupFormProps) {
  const [state, formAction] = useActionState(signupAction, initialState)
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const handleSubmit = (formData: FormData) => {
    if (!acceptTerms) {
      alert('Please accept the terms and conditions to continue')
      return
    }
    startTransition(() => {
      formAction(formData)
    })
  }

  // Show success state if signup was successful
  if (state.success) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
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
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Trust badges */}
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

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Create your account
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Start your 14-day free trial • No credit card required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL error parameter */}
          {error && <AuthError message={error} />}
          
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

          {/* Email/Password Signup Form */}
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  disabled={isPending}
                  className={cn(
                    "h-12 pl-10 text-base transition-all",
                    "focus:ring-2 focus:ring-primary/20",
                    state.errors?.fullName && "border-destructive focus:ring-destructive/20"
                  )}
                  aria-invalid={state.errors?.fullName ? 'true' : 'false'}
                  aria-describedby={state.errors?.fullName ? 'fullName-error' : undefined}
                />
              </div>
              {state.errors?.fullName && (
                <p id="fullName-error" className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {state.errors.fullName[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  disabled={isPending}
                  className={cn(
                    "h-12 pl-10 text-base transition-all",
                    "focus:ring-2 focus:ring-primary/20",
                    state.errors?.email && "border-destructive focus:ring-destructive/20"
                  )}
                  aria-invalid={state.errors?.email ? 'true' : 'false'}
                  aria-describedby={state.errors?.email ? 'email-error' : undefined}
                />
              </div>
              {state.errors?.email && (
                <p id="email-error" className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {state.errors.email[0]}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  required
                  disabled={isPending}
                  className={cn(
                    "h-12 pl-10 pr-10 text-base transition-all",
                    "focus:ring-2 focus:ring-primary/20",
                    state.errors?.password && "border-destructive focus:ring-destructive/20"
                  )}
                  aria-invalid={state.errors?.password ? 'true' : 'false'}
                  aria-describedby={state.errors?.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isPending}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {state.errors?.password && (
                <p id="password-error" className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {state.errors.password[0]}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                Must be at least 8 characters with a mix of letters and numbers
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  disabled={isPending}
                  className={cn(
                    "h-12 pl-10 text-base transition-all",
                    "focus:ring-2 focus:ring-primary/20",
                    state.errors?.confirmPassword && "border-destructive focus:ring-destructive/20"
                  )}
                  aria-invalid={state.errors?.confirmPassword ? 'true' : 'false'}
                  aria-describedby={state.errors?.confirmPassword ? 'confirmPassword-error' : undefined}
                />
              </div>
              {state.errors?.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {state.errors.confirmPassword[0]}
                </p>
              )}
            </div>

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

            {/* Hidden redirect field */}
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium transition-all hover:shadow-lg" 
              disabled={isPending || !acceptTerms}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Free Account'
              )}
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

          {/* OAuth Providers */}
          <OAuthProviders disabled={isPending} />

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