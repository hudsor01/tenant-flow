'use client'

import { useTransition, useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { loginAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { AuthError } from './auth-error'
import { cn } from '@/lib/utils'

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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (formData: FormData) => {
    if (rememberMe) {
      formData.append('rememberMe', 'true')
    }
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Welcome back
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sign in to access your property dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
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
                  aria-invalid={state.errors?.email ? true : false}
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
                  type={showPassword ? "text" : "password"}
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
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
            </div>

            {/* Hidden redirect field */}
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium transition-all hover:shadow-lg" 
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
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