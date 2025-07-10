import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { PremiumButton } from '@/components/ui/button'
import { GoogleContinueButton } from '@/components/ui/google-oauth-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { signInWithGoogle } from '@/lib/supabase-oauth'
import { toast } from 'sonner'
import AuthLayout from './AuthLayout'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * Login form using NestJS backend authentication
 * Handles email/password and Google OAuth authentication
 */
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [supabaseLoading, setSupabaseLoading] = useState(false)
  const { login, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const [error, setError] = useState('')

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({ email: data.email, password: data.password })
      // Navigation is handled by the auth mutation
    } catch {
      setError('Invalid email or password')
    }
  }

  const handleGoogleSignIn = async () => {
    setSupabaseLoading(true)
    setError('')

    try {
      // Try Supabase OAuth first
      const supabaseResult = await signInWithGoogle()
      
      if (supabaseResult.success) {
        toast.success('Redirecting to Google...')
        // signInWithGoogle handles the redirect
        return
      }

      // If Supabase fails, fall back to NestJS backend
      console.warn('Supabase OAuth failed, falling back to NestJS:', supabaseResult.error)
      toast.warning('Trying alternative sign-in method...')
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://tenantflow.app/api/v1'
      window.location.href = `${baseUrl}/auth/google`
    } catch (error) {
      console.error('Google sign-in error:', error)
      setError('Failed to sign in with Google. Please try again.')
      toast.error('Google sign-in failed')
    } finally {
      setSupabaseLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Sign in to your account" 
      subtitle="Welcome back! Please enter your details."
      image={{
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
        alt: 'Modern property management dashboard'
      }}
      heroContent={{
        title: 'Welcome Back',
        description: 'Sign in to continue managing your properties efficiently with TenantFlow\'s powerful tools and insights.'
      }}
    >
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-medium text-red-700">{error}</div>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div>
            <Label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                disabled={isLoading}
                className="!h-12 pl-12 pr-4 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <Label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading}
                className="!h-12 pl-12 pr-12 !text-base rounded-xl border-2 border-border bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm font-medium text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Submit Button */}
          <PremiumButton
            type="submit"
            disabled={isLoading || supabaseLoading}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </PremiumButton>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-4 text-muted-foreground font-medium">Or</span>
          </div>
        </div>

        {/* Google Sign In */}
        <GoogleContinueButton
          onClick={handleGoogleSignIn}
          disabled={isLoading || supabaseLoading}
          loading={supabaseLoading}
          className="h-12"
        />

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/auth/signup"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}