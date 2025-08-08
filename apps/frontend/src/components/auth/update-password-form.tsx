'use client'

import { useTransition } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePasswordAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { AuthError } from './auth-error'

interface UpdatePasswordFormProps {
  error?: string
}

const initialState: AuthFormState = {
  errors: {},
}

export function UpdatePasswordForm({ error }: UpdatePasswordFormProps) {
  const [state, formAction] = useActionState(updatePasswordAction, initialState)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData)
    })
  }

  // Redirect to login after successful password update
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push('/login?message=password-updated')
      }, 3000)
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.success, router])

  // Show success state if password was updated
  if (state.success) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                {state.message} Redirecting to sign in...
              </p>
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
          <CardTitle className="text-2xl font-bold">Create new password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose a strong password to secure your account
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

          {/* Update password form */}
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
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

            <div className="text-xs text-muted-foreground">
              Password should be at least 8 characters long and include a mix of letters, numbers, and symbols.
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isPending}
            >
              {isPending ? 'Updating password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}