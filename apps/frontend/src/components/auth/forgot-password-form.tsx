'use client'

import { 
  cn, 
  buttonClasses, 
  inputClasses, 
  cardClasses,
  formFieldClasses,
  formLabelClasses,
  formErrorClasses,
  animationClasses,
  ANIMATION_DURATIONS, 
  SEMANTIC_COLORS,
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
import Link from 'next/link'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')

  // TanStack Query mutation replacing manual loading states
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      return { success: true }
    }
  })

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    resetPasswordMutation.mutate(email)
  }

  return (
    <div 
      className={cn(
        animationClasses('fade-in'),
        'flex flex-col gap-8 max-w-md mx-auto', 
        className
      )} 
      {...props}
    >
      {resetPasswordMutation.isSuccess ? (
        <Card 
          className={cn(
            cardClasses('elevated'),
            animationClasses('slide-down'),
            'border-2 shadow-2xl'
          )}
        >
          <CardHeader 
            className="space-y-4 text-center pb-6"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
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
                Check Your Email
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed">
                Password reset instructions sent
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium leading-relaxed">
                  If you registered using your email and password, you will receive a password reset email shortly.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
            <Link 
              href="/auth/login" 
              className={cn(
                buttonClasses('ghost', 'sm'),
                "text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium p-0 h-auto",
                "focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
            >
              Back to Login
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                Reset Your Password
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Enter your email address and we'll send you a secure link to reset your password
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent 
            className={cn(
              animationClasses('slide-up'),
              "p-6"
            )}
          >
            <form onSubmit={handleForgotPassword} className="space-y-6">
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
                  required
                  aria-required="true"
                  aria-describedby="email-help"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={resetPasswordMutation.isPending}
                  className={cn(
                    inputClasses('default', 'default'),
                    'h-11 text-base sm:h-9 sm:text-sm focus:ring-2 focus:ring-offset-1'
                  )}
                />
                <p id="email-help" className="text-sm text-muted-foreground leading-relaxed">
                  We'll send password reset instructions to this email address
                </p>
              </div>

              {resetPasswordMutation.isError && (
                <div
                  className={cn(
                    cardClasses('default'),
                    animationClasses('slide-down'),
                    "flex items-center gap-3 p-4 text-destructive bg-destructive/5 border-destructive/20"
                  )}
                  role="alert"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium leading-relaxed">
                    {resetPasswordMutation.error instanceof Error 
                      ? resetPasswordMutation.error.message 
                      : 'An error occurred'}
                  </span>
                </div>
              )}

              <Button 
                type="submit" 
                size="lg"
                className={cn(
                  buttonClasses('primary', 'lg'),
                  'w-full font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80',
                  'shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                  'focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  resetPasswordMutation.isPending && 'scale-95'
                )}
                disabled={resetPasswordMutation.isPending || !email}
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center gap-3">
                    <Loader2 
                      className="w-5 h-5 animate-spin" 
                      style={{
                        animation: `spin 1s linear infinite`,
                      }}
                    />
                    <span>Sending reset email...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5" />
                    <span>Send Reset Email</span>
                  </div>
                )}
              </Button>

              <div 
                className={cn(
                  animationClasses('fade-in'),
                  "text-center text-sm"
                )}
              >
                <p className="text-muted-foreground">
                  Remember your password?{' '}
                  <Link 
                    href="/auth/login" 
                    className={cn(
                      buttonClasses('ghost', 'sm'),
                      "text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium p-0 h-auto",
                      "focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    )}
                  >
                    Back to Login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}