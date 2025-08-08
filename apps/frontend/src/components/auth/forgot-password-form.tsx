'use client'

import { useTransition } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, ArrowLeft, Mail, Loader2, Shield, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { AuthError } from './auth-error'
import { cn } from '@/lib/utils'

interface ForgotPasswordFormProps {
  error?: string
}

const initialState: AuthFormState = {
  errors: {},
}

export function ForgotPasswordForm({ error }: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData)
    })
  }

  // Show success state if email was sent
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
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Secure password reset</span>
      </div>

      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-8">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Reset your password
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Enter your email address and we'll send you a secure link to reset your password
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

          {/* Reset password form */}
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

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium transition-all hover:shadow-lg" 
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          {/* Help text */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>We'll send you an email with instructions to reset your password.</span>
            </p>
          </div>

          {/* Back to sign in link */}
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
    </div>
  )
}