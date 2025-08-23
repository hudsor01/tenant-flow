'use client'

import { useEffect, useState, useTransition } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updatePasswordFormAction,
  type AuthFormState
} from '@/lib/actions/auth-actions'
import { AuthError } from '../auth/auth-error'

interface UpdatePasswordFormProps {
  error?: string
}

const initialState: AuthFormState = {
  success: false
}

type ClientErrors = {
  password?: string
  confirmPassword?: string
}

function validatePassword(pw: string) {
  return {
    len8: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    num: /\d/.test(pw),
    sym: /[^A-Za-z0-9]/.test(pw)
  }
}

export function UpdatePasswordForm({ error }: UpdatePasswordFormProps) {
  const [state, formAction] = useActionState(updatePasswordFormAction, initialState)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // local state for client-side validation + UX
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  const rules = validatePassword(password)
  const allStrong =
    rules.len8 && rules.upper && rules.lower && rules.num && rules.sym

  const onSubmit = (formData: FormData) => {
    // grab values explicitly to validate before invoking the server action
    const pw = (formData.get('password') as string) || ''
    const cpw = (formData.get('confirmPassword') as string) || ''
    const v = validatePassword(pw)

    const errs: ClientErrors = {}
    if (!v.len8) errs.password = 'Password must be at least 8 characters.'
    if (!(v.upper && v.lower && v.num && v.sym)) {
      errs.password =
        errs.password ??
        'Use upper & lower case letters, a number, and a symbol.'
    }
    if (pw !== cpw) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    setClientErrors(errs)
    if (Object.keys(errs).length > 0) return

    startTransition(() => {
      formAction(formData)
    })
  }

  // Redirect to login after successful password update
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push('/login?message=password-updated')
      }, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state.success, router])

  // Show success state if password was updated
  if (state.success) {
    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Password updated successfully! Redirecting to sign in...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const passwordErrorId = clientErrors.password ? 'password-error' : undefined
  const confirmPasswordErrorId = clientErrors.confirmPassword ? 'confirm-error' : undefined

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
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

          {/* Form/server validation errors */}
          {state.error && (
            <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-destructive h-4 w-4" />
                <p className="text-destructive text-sm">{state.error}</p>
              </div>
            </div>
          )}

          {/* Update password form */}
          <form action={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  required
                  disabled={isPending}
                  className="h-11 pr-10"
                  autoComplete="new-password"
                  aria-invalid={!!clientErrors.password}
                  aria-describedby={passwordErrorId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {clientErrors.password && (
                <p id="password-error" className="text-destructive text-sm">
                  {clientErrors.password}
                </p>
              )}
              {/* live checklist */}
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <li className={rules.len8 ? 'text-foreground' : undefined}>≥ 8 characters</li>
                <li className={rules.upper ? 'text-foreground' : undefined}>Uppercase</li>
                <li className={rules.lower ? 'text-foreground' : undefined}>Lowercase</li>
                <li className={rules.num ? 'text-foreground' : undefined}>Number</li>
                <li className={rules.sym ? 'text-foreground' : undefined}>Symbol</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPw2 ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  required
                  disabled={isPending}
                  className="h-11 pr-10"
                  autoComplete="new-password"
                  aria-invalid={!!clientErrors.confirmPassword}
                  aria-describedby={confirmPasswordErrorId}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw2((s) => !s)}
                  aria-label={showPw2 ? 'Hide confirm password' : 'Show confirm password'}
                  title={showPw2 ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {clientErrors.confirmPassword && (
                <p id="confirm-error" className="text-destructive text-sm">
                  {clientErrors.confirmPassword}
                </p>
              )}
            </div>

            {!allStrong && (
              <div className="text-muted-foreground text-xs">
                Password should include a mix of upper &amp; lower case letters, a number, and a
                symbol.
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={isPending}>
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating password…
                </span>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
