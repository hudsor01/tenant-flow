import { cn } from '@/lib/utils/css.utils'
import { supabase } from '@/lib/clients'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import GoogleOneTapButton from '@/components/auth/GoogleOneTapButton'
import { Link } from '@tanstack/react-router'
import { logger } from '@/lib/logger'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)

    try {
      if (!supabase) {
        throw new Error('Authentication service is not available')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      
      // Store the session if one was created
      if (data?.session) {
        // Session exists - user can be logged in after email confirmation
        logger.info('Session created on signup', undefined, { accessToken: data.session?.access_token })
        // For testing: redirect to dashboard immediately if session exists
        window.location.href = '/dashboard'
        return
      }
      
      // For testing: try to sign in immediately after signup (simulates email confirmation)
      logger.debug('Attempting auto-login after signup for testing')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInData?.session && !signInError) {
        logger.info('Auto-login successful', undefined, { accessToken: signInData.session?.access_token })
        window.location.href = '/dashboard'
        return
      }
      
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className={cn('w-full', className)} {...props}>
      {success ? (
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Welcome to TenantFlow!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">Check your email to start your free trial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              You've successfully signed up for your 14-day free trial. Please check your email to confirm your account and get started.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <strong className="block mb-1">Next steps:</strong>
              1. Check your email inbox<br />
              2. Click the confirmation link<br />
              3. Set up your free trial and start managing properties
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setSuccess(false)}
            >
              Back to Sign Up
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
            <CardDescription>
              Create an account and get 14 days of full access to TenantFlow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign Up Button */}
            <div className="mb-6">
              <GoogleOneTapButton text="signup_with" />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Sign Up Form */}
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@tenantflow.app"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="repeat-password">Repeat Password</Label>
                  </div>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating your account...' : 'Start Free Trial'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link to="/auth/login" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
