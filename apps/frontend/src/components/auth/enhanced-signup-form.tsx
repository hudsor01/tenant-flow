'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from '@/lib/framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, Mail, Lock, User, ArrowRight, 
  Eye, EyeOff, AlertCircle, Shield, Check, Zap, Star
} from 'lucide-react'
// import { cn } from '@/lib/utils'
import { supabase } from '@/lib/clients'

interface EnhancedSignupFormProps {
  redirectTo?: string
}

export function EnhancedSignupForm({ redirectTo = '/dashboard' }: EnhancedSignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
        },
      })

      if (error) throw error

      if (data.user) {
        setSuccess(true)
      }
    } catch (error: unknown) {
      setError(error.message || 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      setError(error.message || 'Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="card-elevated p-8 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" 
          style={{ backgroundColor: 'var(--success-100)' }}>
          <Check className="w-8 h-8" style={{ color: 'var(--success-600)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Check your email!
        </h2>
        <p style={{ color: 'var(--foreground-muted)' }}>
          We've sent a confirmation link to <strong>{email}</strong>
        </p>
        <p className="mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Click the link in your email to activate your account and start your free trial.
        </p>
      </Card>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual with Brand Gradient */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden"
        style={{
          background: 'var(--gradient-brand)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 4s ease infinite',
          color: 'var(--foreground-inverse)'
        }}
      >
        {/* Animated mesh background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: 'var(--gradient-brand-mesh)',
            filter: 'blur(60px)'
          }}
        />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md relative z-10"
        >
          <div className="relative mb-6">
            <Star className="h-12 w-12" />
            <div className="absolute inset-0 animate-pulse">
              <Star className="h-12 w-12 opacity-50" style={{ filter: 'blur(8px)' }} />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Join 10,000+ Property Managers
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Unlimited properties & tenants</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Automated rent collection with Stripe</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Maintenance request tracking</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>24/7 tenant portal access</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>Financial reports & analytics</span>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-8 pt-8 border-t" style={{ borderColor: 'oklch(1 0 0 / 0.2)' }}>
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <p className="text-sm opacity-90">
              "TenantFlow transformed how we manage our 200+ properties. The automation saves us 20 hours per week!"
            </p>
            <p className="text-sm mt-2 font-semibold">
              — Sarah Chen, Property Manager
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: 'var(--background)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <Building2 className="h-8 w-8" style={{ color: 'var(--steel-600)' }} />
            <span className="text-2xl font-bold text-gradient-brand">TenantFlow</span>
          </Link>

          {/* Welcome Text */}
          <div className="mb-8">
            <Badge className="badge-accent mb-4">
              <Zap className="w-3 h-3 mr-1" />
              14-Day Free Trial
            </Badge>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Create your account
            </h1>
            <p style={{ color: 'var(--foreground-muted)' }}>
              Get started with TenantFlow in less than a minute
            </p>
          </div>

          {/* Signup Form */}
          <Card className="card-elevated p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--foreground-muted)' }} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 input-field"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--foreground-muted)' }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 input-field"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--foreground-muted)' }} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 input-field"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  Must be at least 6 characters
                </p>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" className="underline" style={{ color: 'var(--primary)' }}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline" style={{ color: 'var(--primary)' }}>
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full btn-brand shadow-xl"
                disabled={isLoading || !acceptTerms}
              >
                {isLoading ? 'Creating account...' : 'Start Free Trial'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground-muted)' }}>
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Signup */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                Already have an account?{' '}
                <Link 
                  href="/auth/login" 
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center">
            <Badge variant="outline" className="badge-primary">
              <Shield className="w-3 h-3 mr-1" />
              Secured with bank-level encryption
            </Badge>
          </div>
        </motion.div>
      </div>
    </div>
  )
}