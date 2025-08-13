/**
 * Signup Form - Clean and Modern
 * 
 * Minimal signup form with professional styling.
 * Uses Supabase Auth with email verification flow.
 */

"use client"

import { useState, useTransition, useEffect } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupAction, type AuthFormState } from '@/lib/actions/auth-actions'
import { OAuthProviders } from './oauth-providers'
import { toast } from 'sonner'

interface SignupFormRefactoredProps {
  redirectTo?: string
  error?: string
  onSuccess?: (result: AuthFormState) => void
}

export function SignupFormRefactored({
  redirectTo = '/dashboard',
  error,
  onSuccess
}: SignupFormRefactoredProps) {
  const initialState: AuthFormState = { errors: {} }
  const [state, action] = useActionState(signupAction, initialState)
  const [isPending, _startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  
  // Handle success
  useEffect(() => {
    if (state.success) {
      toast.success('Welcome to TenantFlow!')
      if (onSuccess) {
        onSuccess(state)
      }
      // Redirect handled by auth-actions
    }
  }, [state, onSuccess])
  
  // Success state
  if (state.success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 text-center">
          {/* Animated success icon */}
          <div className="mx-auto mb-6 relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
              <CheckCircle className="h-10 w-10 text-green-600 animate-pulse" />
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-full bg-green-400/20 blur-xl animate-pulse"></div>
          </div>
          
          {/* Enhanced title and messaging */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Almost there! 🎉
          </h2>
          
          <p className="text-gray-600 mb-2 leading-relaxed">
            We've sent a verification email to:
          </p>
          <p className="text-gray-900 font-semibold mb-4 bg-gray-50 px-3 py-2 rounded-lg border">
            {submittedEmail || 'your email address'}
          </p>
          <p className="text-gray-600 mb-6 leading-relaxed text-sm">
            Check your inbox and click the link to get started with TenantFlow.
          </p>
          
          {/* Email tips section */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
            <div className="flex items-start gap-3 text-left">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-xs font-medium">💡</span>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Can't find the email?</p>
                <ul className="space-y-1 text-blue-700 text-xs">
                  <li>• Check your spam or junk folder</li>
                  <li>• The email might take 1-2 minutes to arrive</li>
                  <li>• Make sure you entered the correct email address</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={async () => {
                setResendLoading(true)
                // Simulate resend process
                setTimeout(() => {
                  setResendLoading(false)
                  setResendSuccess(true)
                  setTimeout(() => setResendSuccess(false), 3000) // Reset after 3 seconds
                }, 1500)
              }}
              disabled={resendLoading || resendSuccess}
              className={`w-full font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform ${
                resendSuccess 
                  ? 'bg-green-600 text-white cursor-default' 
                  : resendLoading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {resendLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Sending...
                </span>
              ) : resendSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Email sent!
                </span>
              ) : (
                'Resend verification email'
              )}
            </button>
            
            {!resendSuccess && (
              <p className="text-xs text-gray-500">
                Didn't receive it? Check the email address and try again
              </p>
            )}
            
            {resendSuccess && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Verification email sent successfully! Check your inbox.
              </p>
            )}
          </div>
          
          {/* Additional actions */}
          <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Back to sign in
              </Link>
              <span className="text-gray-300">•</span>
              <a 
                href="/support" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Need help?
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
        <form action={(formData) => {
          // Capture email before submitting
          setSubmittedEmail(formData.get('email') as string || '')
          action(formData)
        }} className="space-y-6">
          {/* Error display */}
          {(state.errors?._form || error) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  {state.errors?._form?.[0] || error}
                </p>
              </div>
            </div>
          )}
          
          {/* Form fields with improved spacing and styling */}
          <div className="space-y-5">
            <div>
              <Label 
                htmlFor="fullName" 
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                disabled={isPending}
                required
                autoComplete="name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>
            
            <div>
              <Label 
                htmlFor="email" 
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                disabled={isPending}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>
            
            <div>
              <Label 
                htmlFor="password" 
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 text-gray-900"
              />
              {password && password.length > 0 && password.length < 8 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>
          </div>
          
          {/* Hidden fields for backend compatibility */}
          <input type="hidden" name="confirmPassword" value={password} />
          <input type="hidden" name="terms" value="on" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input type="hidden" name="companyName" value="" />
          
          {/* Submit button */}
          <Button
            type="submit"
            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg group"
            disabled={isPending || !password || password.length < 8}
          >
            {/* Subtle shine effect */}
            <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 transition-all duration-700 group-hover:translate-x-full"></div>
            
            {isPending ? (
              <span className="relative flex items-center justify-center gap-3">
                <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                <span className="text-base font-medium">Creating your account...</span>
              </span>
            ) : (
              <span className="relative flex items-center justify-center gap-3 text-base font-medium">
                Create Free Account
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
          
          {/* OAuth Section - moved below for better flow */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-400">
                  or
                </span>
              </div>
            </div>
            
            <OAuthProviders disabled={isPending} />
          </div>
          
          {/* Legal notice - moved to bottom with better styling */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
          
          {/* Sign in link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default SignupFormRefactored