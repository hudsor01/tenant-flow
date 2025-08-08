'use client'

import { useTransition } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { loginAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'

interface LoginFormProps {
  redirectTo?: string
  error?: string
}

const initialState: AuthFormState = {
  errors: {},
}

export function LoginForm({ redirectTo, error }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success message for email confirmation */}
          {redirectTo?.includes('emailConfirmed=true') && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Email confirmed successfully! Please sign in to continue.
              </p>
            </div>
          )}

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

          {/* Email/Password Login Form */}
          <form action={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
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

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                name="remember"
                disabled={isPending}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {/* Hidden redirect field */}
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isPending}
            >
              {isPending ? 'Signing in...' : 'Sign in with Email'}
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

          {/* Sign up link */}
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}