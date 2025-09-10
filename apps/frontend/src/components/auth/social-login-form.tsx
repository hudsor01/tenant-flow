'use client'

import { 
  cn, 
  buttonClasses, 
  inputClasses, 
  cardClasses,
  formFieldClasses,
  formLabelClasses,
  animationClasses,
  ANIMATION_DURATIONS, 
  TYPOGRAPHY_SCALE 
} from '@/lib/utils'
import { supabaseClient } from '@repo/shared'
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
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

export function SocialLoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // TanStack Query mutations replacing manual loading states
  const emailLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return { success: true }
    }
  })

  const socialLoginMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/oauth?next=/dashboard`,
        },
      })
      if (error) throw error
      return { success: true }
    }
  })

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    emailLoginMutation.mutate({ email, password })
  }

  const handleSocialLogin = async () => {
    socialLoginMutation.mutate()
  }

  // Either mutation being pending means the form is loading
  const isLoading = emailLoginMutation.isPending || socialLoginMutation.isPending
  const error = emailLoginMutation.error || socialLoginMutation.error

  return (
    <div 
      className={cn(
        animationClasses('fade-in'),
        'flex flex-col gap-8 max-w-md mx-auto', 
        className
      )} 
      {...props}
    >
      <Card 
        className={cn(
          cardClasses('elevated'),
          animationClasses('fade-in'),
          'border-2 shadow-2xl'
        )}
      >
        <CardHeader 
          className={cn(
            animationClasses('slide-down'),
            "space-y-4 text-center pb-6"
          )}
        >
          <div className="space-y-3">
            <CardTitle 
              className="font-bold tracking-tight"
              style={{
                fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
                letterSpacing: TYPOGRAPHY_SCALE['heading-xl'].letterSpacing,
                fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
              }}
            >
              Welcome back
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Enter your credentials to access your TenantFlow dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent 
          className={cn(
            animationClasses('slide-up'),
            "space-y-6 p-6"
          )}
        >
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className={cn(formFieldClasses(false), animationClasses('slide-up'))}>
              <Label 
                htmlFor="email"
                className={cn(
                  formLabelClasses(true),
                  "text-sm font-medium text-foreground"
                )}
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-describedby="email-help"
                disabled={isLoading}
                className={cn(
                  inputClasses('default', 'default'),
                  'h-11 text-base sm:h-9 sm:text-sm focus:ring-2 focus:ring-offset-1'
                )}
              />
              <p id="email-help" className="text-sm text-muted-foreground leading-relaxed sr-only">
                Enter your email address to sign in
              </p>
            </div>
            <div className={cn(formFieldClasses(false), animationClasses('slide-up'))}>
              <div className="flex items-center justify-between">
                <Label 
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium transition-colors"
                  style={{
                    transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={cn(
                    inputClasses('default'),
                    'pr-10 focus:border-primary focus:ring-primary/20'
                  )}
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  style={{
                    transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div
                className="flex items-center gap-3 text-sm p-4 rounded-lg border-2 text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800"
                style={{ 
                  animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
                }}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium leading-relaxed">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </span>
              </div>
            )}
            <Button 
              type="submit" 
              className={cn(
                buttonClasses('primary', 'default'),
                'w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl',
              )}
              disabled={isLoading || !email || !password}
              style={{
                transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
                transform: emailLoginMutation.isPending ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {emailLoginMutation.isPending ? (
                <div className="flex items-center gap-3">
                  <Loader2 
                    className="w-5 h-5 animate-spin" 
                    style={{
                      animation: `spin 1s linear infinite`,
                    }}
                  />
                  <span>Signing you in...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                </span>
              )}
            </Button>
          </form>
          
          <div 
            className="relative flex items-center justify-center py-4"
            style={{ 
              animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
            }}
          >
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground font-medium">
                Or continue with
              </span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className={cn(
              buttonClasses('outline', 'default'),
              'w-full h-12 text-base font-medium border-2 hover:bg-muted/50',
            )}
            onClick={handleSocialLogin}
            disabled={isLoading}
            style={{
              transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
              transform: socialLoginMutation.isPending ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            {socialLoginMutation.isPending ? (
              <div className="flex items-center gap-3">
                <Loader2 
                  className="w-5 h-5 animate-spin" 
                  style={{
                    animation: `spin 1s linear infinite`,
                  }}
                />
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </Button>
          
          <div 
            className="text-center text-sm"
            style={{ 
              animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
            }}
          >
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link 
                href="/auth/sign-up" 
                className="text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium transition-colors"
                style={{
                  transition: `color ${ANIMATION_DURATIONS.fast} ease-out`,
                }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}