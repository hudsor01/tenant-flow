'use client'

import { useTransition } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { AuthError } from './auth-error'

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
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent reset instructions to your email
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
              <Link 
                href="/login"
                className="inline-flex items-center text-primary hover:underline"
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
    <div className="flex flex-col gap-6 w-full max-w-md">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
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

          {/* Reset password form */}
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

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isPending}
            >
              {isPending ? 'Sending reset link...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to sign in link */}
          <div className="text-center text-sm">
            <Link 
              href="/login"
              className="inline-flex items-center text-primary hover:underline"
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