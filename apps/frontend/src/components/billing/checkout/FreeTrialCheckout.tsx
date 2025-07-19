import { useState, type FormEvent } from 'react'
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, CreditCard, Calendar, Mail, User, Lock } from 'lucide-react'
import { trpc } from '@/lib/api'
import { useAuth } from '@/hooks/useApiAuth'

interface FreeTrialCheckoutProps {
  planName?: string
  onSuccess?: () => void
  onSkipPaymentMethod?: () => void
  returnUrl?: string
  requirePaymentMethod?: boolean
}

interface UserFormData {
  email: string
  name: string  
  password: string
}

export function FreeTrialCheckout({ 
  planName: _planName = 'Free Trial',
  onSuccess,
  onSkipPaymentMethod,
  returnUrl: _returnUrl,
  requirePaymentMethod = false
}: FreeTrialCheckoutProps) {
  const stripe = useStripe()
  useElements() // Elements instance - not used in current implementation
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>({ email: '', name: '', password: '' })
  const [paymentMethodCollectionMode, setPaymentMethodCollectionMode] = useState<'required' | 'optional'>('optional')

  // For authenticated users - simple trial start
  const startTrial = trpc.subscriptions.create.useMutation({
    onSuccess: (data) => {
      console.log('Trial started successfully:', data)
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Trial start failed:', error)
      setErrorMessage(error.message || 'Failed to start your trial')
    },
  })

  // For new users - create account + trial in one operation
  const createWithSignup = trpc.subscriptions.createWithSignup.useMutation({
    onSuccess: (data) => {
      console.log('Account created and trial started:', data)
      
      // Tokens are now managed by Supabase automatically
      // No need to store tokens in localStorage
      
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Signup with trial failed:', error)
      setErrorMessage(error.message || 'Failed to create account and start trial')
    },
  })

  // Helper function to validate form data
  const validateForm = (): string | null => {
    if (!user) {
      if (!formData.email || !formData.name || !formData.password) {
        return 'Please fill in all required fields.'
      }
      if (!formData.email.includes('@')) {
        return 'Please enter a valid email address.'
      }
      if (formData.password.length < 8) {
        return 'Password must be at least 8 characters long.'
      }
    }
    return null
  }

  const handleStartTrial = async (withPaymentMethod = false) => {
    const validation = validateForm()
    if (validation) {
      setErrorMessage(validation)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (user) {
        // Authenticated user - simple trial start
        await startTrial.mutateAsync({
          planId: 'FREE',
          billingPeriod: 'MONTHLY',
          paymentMethodCollection: withPaymentMethod ? 'always' : 'if_required'
        })
        onSuccess?.()
      } else {
        // New user - create account + trial in one operation
        await createWithSignup.mutateAsync({
          planId: 'FREE',
          billingPeriod: 'MONTHLY',
          userEmail: formData.email,
          userName: formData.name,
          createAccount: true,
          paymentMethodCollection: withPaymentMethod ? 'always' : 'if_required'
        })
        onSuccess?.()
      }
    } catch (error) {
      console.error('Trial start error:', error)
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to start your trial'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitWithPayment = async (event: FormEvent) => {
    event.preventDefault()
    await handleStartTrial(true)
  }

  const handleSkipPaymentMethod = async () => {
    await handleStartTrial(false)
    onSkipPaymentMethod?.()
  }

  const handleFormChange = (field: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    setErrorMessage(null)
  }

  const isDisabled = !stripe || isLoading || startTrial.isPending || createWithSignup.isPending

  return (
    <Card className="w-full max-w-lg mx-auto bg-white border-2 border-gray-200 shadow-xl">
      <CardHeader className="text-center bg-gradient-to-br from-blue-50 to-slate-50 rounded-t-lg">
        <div className="flex items-center justify-center mb-2">
          <Badge variant="secondary" className="text-sm font-medium bg-green-100 text-green-800 border-green-200">
            <Calendar className="w-4 h-4 mr-1" />
            14-Day Free Trial
          </Badge>
        </div>
        <CardTitle className="text-2xl text-gray-900">
          {user ? 'Start Your Free Trial' : 'Create Account & Start Trial'}
        </CardTitle>
        <CardDescription className="text-base text-gray-700">
          {user 
            ? 'Get full access to TenantFlow for 14 days. No charges until your trial ends.'
            : 'Create your account and get full access to TenantFlow for 14 days. No charges until your trial ends.'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 bg-white">
        {/* User Registration Form - Only show for non-authenticated users */}
        {!user && (
          <div className="space-y-4 p-4 border-2 border-blue-100 rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Your Account</h3>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleFormChange('email')}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={formData.name}
                onChange={handleFormChange('name')}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleFormChange('password')}
                className="w-full"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
            </div>
          </div>
        )}

        {/* Trial Benefits */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">What's included in your trial:</h4>
          <ul className="space-y-1 text-sm text-green-800">
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Up to 3 properties
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Unlimited tenant management
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Basic reporting & analytics
            </li>
            <li className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Email support
            </li>
          </ul>
        </div>

        {/* Payment Method Section */}
        {!requirePaymentMethod && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Payment Method</h4>
              <div className="flex gap-2">
                <Button
                  variant={paymentMethodCollectionMode === 'required' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethodCollectionMode('required')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Add Now
                </Button>
                <Button
                  variant={paymentMethodCollectionMode === 'optional' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethodCollectionMode('optional')}
                >
                  Skip
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                {paymentMethodCollectionMode === 'required' 
                  ? "We'll save your payment method but won't charge until your trial ends."
                  : "You can add a payment method later to continue after your trial ends."
                }
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Payment Form or Skip Option */}
        {(requirePaymentMethod || paymentMethodCollectionMode === 'required') ? (
          <form onSubmit={handleSubmitWithPayment} className="space-y-6">
            <div className="space-y-4">
              <PaymentElement 
                options={{
                  layout: 'accordion',
                  wallets: {
                    applePay: 'auto',
                    googlePay: 'auto',
                  },
                  fields: {
                    billingDetails: {
                      name: 'auto',
                      email: 'auto',
                      address: 'auto',
                    },
                  },
                  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                }}
              />
            </div>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              variant="default"
              disabled={isDisabled}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Your Trial...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleSkipPaymentMethod}
              variant="default"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Your Trial...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Cancel anytime during your trial to avoid charges.</p>
          <p>After your trial, you'll be charged $29/month unless cancelled.</p>
        </div>
      </CardContent>
    </Card>
  )
}