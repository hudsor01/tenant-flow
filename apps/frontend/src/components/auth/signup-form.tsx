'use client'

import { useTransition } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'

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

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData)
    })
  }

  // Show success state if signup was successful
  if (state.success) {
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
                {state.message}
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
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                disabled={isPending}
                className="h-11"
                aria-invalid={state.errors?.fullName ? 'true' : 'false'}
                aria-describedby={state.errors?.fullName ? 'fullName-error' : undefined}
              />
              {state.errors?.fullName && (
                <p id="fullName-error" className="text-sm text-destructive">
                  {state.errors.fullName[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                disabled={isPending}
                className="h-11"
                aria-invalid={state.errors?.email ? 'true' : 'false'}
                aria-describedby={state.errors?.email ? 'email-error' : undefined}
              />
              {state.errors?.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {state.errors.email[0]}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a secure password"
                required
                disabled={isPending}
                className="h-11"
                aria-invalid={state.errors?.password ? 'true' : 'false'}
                aria-describedby={state.errors?.password ? 'password-error' : undefined}
              />
              {state.errors?.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                disabled={isPending}
                className="h-11"
                aria-invalid={state.errors?.confirmPassword ? 'true' : 'false'}
                aria-describedby={state.errors?.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {state.errors?.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive">
                  {state.errors.confirmPassword[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Your company name"
                disabled={isPending}
                className="h-11"
                aria-invalid={state.errors?.companyName ? 'true' : 'false'}
                aria-describedby={state.errors?.companyName ? 'companyName-error' : undefined}
              />
              {state.errors?.companyName && (
                <p id="companyName-error" className="text-sm text-destructive">
                  {state.errors.companyName[0]}
                </p>
              )}
            </div>

            {/* Hidden redirect field */}
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isPending}
            >
              {isPending ? 'Creating account...' : 'Create Account'}
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