import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

import { useAuthStore } from '@/store/authStore'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
// Card components not currently used in this UI
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SupabaseAuthUIProps {
  view?: 'sign_in' | 'sign_up' | 'forgotten_password'
  redirectTo?: string
}

export default function SupabaseAuthUI({ 
  view = 'sign_in',
  redirectTo = '/dashboard' 
}: SupabaseAuthUIProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading, setUser, checkSession } = useAuthStore()
  const [authView, setAuthView] = useState(view)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      navigate(redirectTo)
    }
  }, [user, isLoading, navigate, redirectTo])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        if (event === 'SIGNED_IN' && session) {
          await checkSession()
          toast.success('Welcome back!')
          navigate(redirectTo)
        } else if (event === 'SIGNED_OUT') {
          navigate('/auth/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate, redirectTo, checkSession])

  // Handle view changes based on URL and show messages
  useEffect(() => {
    const path = location.pathname
    const params = new URLSearchParams(location.search)
    
    // Check for subscription success message
    if (params.get('message') === 'subscription-created') {
      setSuccessMessage('Subscription created successfully! Check your email to set your password.')
      const emailParam = params.get('email')
      if (emailParam) {
        setEmail(emailParam)
      }
    }
    
    if (path.includes('signup')) {
      setAuthView('sign_up')
    } else if (path.includes('forgot-password')) {
      setAuthView('forgotten_password')
    } else {
      setAuthView('sign_in')
    }
  }, [location.pathname, location.search])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error

      if (data.user) {
        const { data: profile } = await supabase
          .from('User')
          .select('*, tenant:Tenant(*)')
          .eq('id', data.user.id)
          .single()

        setUser(data.user)
        
        if (profile?.tenant) {
          navigate('/tenant/dashboard')
        } else {
          navigate(redirectTo)
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error

      if (data.user) {
        setSuccessMessage('Check your email to confirm your account!')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      
      if (error) throw error

      setSuccessMessage('Check your email for password reset instructions')
      setEmail('')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setLoading(false)
    }
  }

  const getViewTitle = () => {
    switch (authView) {
      case 'sign_up':
        return 'Create your account'
      case 'forgotten_password':
        return 'Reset your password'
      default:
        return 'Welcome back'
    }
  }

  const getViewSubtitle = () => {
    switch (authView) {
      case 'sign_up':
        return 'Start managing your properties today with a free account.'
      case 'forgotten_password':
        return 'Enter your email and we\'ll send you reset instructions.'
      default:
        return 'Sign in to your account to continue managing your properties.'
    }
  }

  const getHeroContent = () => {
    switch (authView) {
      case 'sign_up':
        return {
          title: 'Start Your Journey',
          description: 'Join thousands of property owners who trust TenantFlow to manage their rentals efficiently. Get started with our comprehensive platform.',
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
        }
      case 'forgotten_password':
        return {
          title: 'Secure & Simple',
          description: 'We\'ll help you regain access to your account quickly and securely. Your property data is always protected.',
          image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2126&q=80'
        }
      default:
        return {
          title: 'Manage Properties with Ease',
          description: 'Streamline your property management workflow with our comprehensive platform. Track tenants, manage leases, and handle maintenance all in one place.',
          image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
        }
    }
  }

  const heroContent = getHeroContent()

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="flex items-center mb-8">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">TenantFlow</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{getViewTitle()}</h1>
            <p className="text-gray-600">{getViewSubtitle()}</p>
          </div>

          {/* Auth Forms */}
          <div className="space-y-6">
            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {authView === 'sign_in' && (
              <form onSubmit={handleSignIn}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/auth/forgot-password"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Don&apos;t have an account?{' '}
                  <Link to="/auth/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            )}

            {authView === 'sign_up' && (
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{' '}
                  <Link to="/auth/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            )}

            {authView === 'forgotten_password' && (
              <form onSubmit={handlePasswordReset}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send reset instructions'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Remember your password?{' '}
                  <Link to="/auth/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            )}

            {(authView === 'sign_in' || authView === 'sign_up') && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Right side - Hero Image */}
      <motion.div
        className="hidden lg:block lg:w-1/2 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-10"></div>
        <img
          src={heroContent.image}
          alt="TenantFlow Property Management"
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
          <h2 className="text-4xl font-bold mb-4">{heroContent.title}</h2>
          <p className="text-lg opacity-90">{heroContent.description}</p>
        </div>
      </motion.div>
    </div>
  )
}