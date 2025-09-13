"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import React, { useState } from 'react'

interface AuthFormProps {
  className?: string
  mode?: 'login' | 'signup'
  onSubmit?: (data: { email: string; password: string; firstName?: string; lastName?: string; company?: string }) => void
  onForgotPassword?: () => void
  onSignUp?: () => void
  onGoogleLogin?: () => void
  isLoading?: boolean
  isGoogleLoading?: boolean
}

export function LoginForm({ 
  className, 
  mode = 'login', 
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogleLogin,
  isLoading,
  isGoogleLoading
}: AuthFormProps) {
  const isLogin = mode === 'login'
  const [form, setForm] = useState({
    firstName: '', lastName: '', company: '', email: '', password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit?.(form)
  }

  return (
    <div className={cn('w-full', className)}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required autoComplete="given-name" value={form.firstName} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required autoComplete="family-name" value={form.lastName} onChange={handleChange} />
            </div>
          </div>
        )}

        {!isLogin && (
          <div>
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" required autoComplete="organization" value={form.company} onChange={handleChange} />
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" value={form.email} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete={isLogin ? 'current-password' : 'new-password'} value={form.password} onChange={handleChange} />
        </div>

        {!isLogin && (
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>
        )}

        <div className="space-y-3 pt-1">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
          {isLogin && (
            <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin} disabled={isGoogleLoading}>
              {isGoogleLoading ? 'Connecting…' : 'Continue with Google'}
            </Button>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <button type="button" onClick={onForgotPassword} className="hover:text-foreground">
              Forgot password?
            </button>
            {isLogin ? (
              <button type="button" onClick={onSignUp} className="hover:text-foreground">
                Create account
              </button>
            ) : (
              <a href="/auth/login" className="hover:text-foreground">Have an account? Sign in</a>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default LoginForm

