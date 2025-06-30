import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react'
import { PremiumButton } from '@/components/ui/enhanced-button'
import { GoogleContinueButton } from '@/components/ui/google-oauth-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/store/authStore'
import { useGTM } from '@/hooks/useGTM'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import AuthLayout from './AuthLayout'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp } = useAuthStore()
  const { trackSignup } = useGTM()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      terms: false,
    },
  })

  const termsAccepted = watch('terms')
  const password = watch('password')

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' }
    
    let strength = 0
    if (password.length >= 6) strength += 1
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1
    if (password.match(/\d/)) strength += 1
    if (password.match(/[^a-zA-Z\d]/)) strength += 1

    const levels = [
      { strength: 0, text: '', color: '' },
      { strength: 1, text: 'Weak', color: 'text-red-500' },
      { strength: 2, text: 'Fair', color: 'text-orange-500' },
      { strength: 3, text: 'Good', color: 'text-yellow-500' },
      { strength: 4, text: 'Strong', color: 'text-green-500' },
    ]

    return levels[strength]
  }

  const passwordStrength = getPasswordStrength(password || '')

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // Track signup attempt in GTM before actual signup
      trackSignup('email')
      
      await signUp(data.email, data.password, data.name)
      toast.success('Account created successfully!')
      navigate('/auth/login')
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || 'Failed to create account')
      toast.error('Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Track Google signup attempt in GTM before actual signup
      trackSignup('google')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || 'Failed to sign up with Google')
      toast.error('Google sign-up failed')
      setIsLoading(false)
    }
  }

  const formContent = (
    <>
      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium"
        >
          {error}
        </motion.div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Label htmlFor="name" className="block text-sm font-semibold text-foreground mb-3">
            Full name
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="w-full pl-12 pr-4 py-3 border-2 border-border rounded-xl bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
              {...register('name')}
              disabled={isLoading}
            />
          </div>
          {errors.name && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-red-600 font-medium"
            >
              {errors.name.message}
            </motion.p>
          )}
        </motion.div>

        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label htmlFor="email" className="block text-sm font-semibold text-foreground mb-3">
            Email address
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full pl-12 pr-4 py-3 border-2 border-border rounded-xl bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
              {...register('email')}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-red-600 font-medium"
            >
              {errors.email.message}
            </motion.p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label htmlFor="password" className="block text-sm font-semibold text-foreground mb-3">
            Password
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 border-2 border-border rounded-xl bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
              {...register('password')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 flex items-center gap-2"
            >
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength.strength >= 1 ? 'bg-red-500' : 'bg-transparent'
                  }`}
                  style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${passwordStrength.color}`}>
                {passwordStrength.text}
              </span>
            </motion.div>
          )}
          
          {errors.password && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-red-600 font-medium"
            >
              {errors.password.message}
            </motion.p>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-3">
            Confirm password
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 border-2 border-border rounded-xl bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-base"
              {...register('confirmPassword')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-red-600 font-medium"
            >
              {errors.confirmPassword.message}
            </motion.p>
          )}
        </motion.div>

        {/* Terms Checkbox */}
        <motion.div 
          className="flex items-start gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Checkbox 
            id="terms" 
            className="h-5 w-5 mt-0.5"
            checked={termsAccepted}
            onCheckedChange={(checked) => setValue('terms', checked as boolean)}
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
            I agree to the{' '}
            <Link to="/terms" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
          </label>
        </motion.div>
        {errors.terms && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600 font-medium"
          >
            {errors.terms.message}
          </motion.p>
        )}

        {/* Create Account Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <PremiumButton
            type="submit"
            size="lg"
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
            icon={<CheckCircle className="h-5 w-5" />}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </PremiumButton>
        </motion.div>
      </form>

      {/* Google OAuth - Professional Integration */}
      <motion.div 
        className="mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground font-medium">
              Or
            </span>
          </div>
        </div>

        <GoogleContinueButton
          onClick={() => handleSocialLogin(new Event('submit') as unknown as React.FormEvent)}
          disabled={isLoading}
          loading={isLoading}
        />
      </motion.div>

      {/* Sign In Link */}
      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link 
            to="/auth/login" 
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </>
  )

  return (
    <AuthLayout
      side="right"
      title="Start your journey"
      subtitle="Create your account and join thousands of property owners who trust TenantFlow."
      image={{
        src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
        alt: "Beautiful modern home with contemporary design"
      }}
      heroContent={{
        title: "Start Your Journey",
        description: "Join thousands of property owners who trust TenantFlow to manage their rentals efficiently. Get started with our 14-day free trial."
      }}
    >
      {formContent}
    </AuthLayout>
  )
}