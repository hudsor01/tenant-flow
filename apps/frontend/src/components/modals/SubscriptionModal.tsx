import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    CreditCard,
    Mail,
    CheckCircle,
    ArrowRight,
    Calendar,
    Loader2
} from 'lucide-react'
import { getPlanById, type Plan } from '@/types/subscription'
import type { PlanType } from '@/types/prisma-types'
import { useAuth } from '@/hooks/useApiAuth'
import {
    useCreateSubscription,
    useCreateSubscriptionWithSignup,
    useStartTrial
} from '@/hooks/useSubscription'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'

interface SubscriptionModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    planId: PlanType
    billingPeriod: 'monthly' | 'annual'
}

interface UserFormData {
    email: string
    name: string
}



// Helper function to validate form data
const validateUserForm = (formData: UserFormData): string | null => {
    if (!formData.email || !formData.name) {
        return 'Please fill in all required fields.'
    }
    if (!formData.email.includes('@')) {
        return 'Please enter a valid email address.'
    }
    return null
}

// Helper function to get billing period in uppercase
const getBillingPeriodUppercase = (period: 'monthly' | 'annual'): 'MONTHLY' | 'ANNUAL' => {
    return period.toUpperCase() as 'MONTHLY' | 'ANNUAL'
}

// Helper to calculate annual price from monthly
const calculateAnnualPrice = (monthlyPrice: number): number => {
    return monthlyPrice * 10 // 2 months free on annual billing
}

export default function SubscriptionModal({
    isOpen,
    onOpenChange,
    planId,
    billingPeriod
}: SubscriptionModalProps) {
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [formData, setFormData] = useState<UserFormData>({ email: '', name: '' })
    const [validationError, setValidationError] = useState<string | null>(null)
    
    const { user } = useAuth()
    const { redirectToCheckout, isLoading: isRedirecting } = useStripeCheckout()
    
    const createSubscriptionMutation = useCreateSubscription()
    const createSubscriptionWithSignupMutation = useCreateSubscriptionWithSignup()
    const startTrialMutation = useStartTrial()
    
    const plan = getPlanById(planId)
    if (!plan) return null
    
    // Calculate prices based on billing period
    const monthlyPrice = plan.price
    const annualPrice = calculateAnnualPrice(monthlyPrice)
    const price = billingPeriod === 'monthly' ? monthlyPrice : annualPrice
    const priceId = plan.stripePriceId // We'll need to handle monthly/annual price IDs differently
    
    const isLoading = 
        createSubscriptionMutation.isPending ||
        createSubscriptionWithSignupMutation.isPending ||
        startTrialMutation.isPending ||
        isRedirecting
    
    const handleFormChange = (field: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }))
        setValidationError(null)
    }
    
    const handleFreeTrial = async () => {
        const validation = user ? null : validateUserForm(formData)
        if (validation) {
            setValidationError(validation)
            return
        }
        
        if (user) {
            // Authenticated user - start trial directly
            startTrialMutation.mutate(undefined, {
                onSuccess: () => {
                    setShowSuccessModal(true)
                    onOpenChange(false)
                },
                onError: (error) => {
                    setValidationError(error.message || 'Failed to start trial')
                }
            })
        } else {
            // New user - create account and start trial
            const requestBody = {
                planId,
                billingPeriod: getBillingPeriodUppercase(billingPeriod),
                userEmail: formData.email,
                userName: formData.name,
                createAccount: true
            }
            
            createSubscriptionWithSignupMutation.mutate(requestBody, {
                onSuccess: (data) => {
                    // Store auth tokens
                    if (data.accessToken && data.refreshToken) {
                        localStorage.setItem('access_token', data.accessToken)
                        localStorage.setItem('refresh_token', data.refreshToken)
                    }
                    setShowSuccessModal(true)
                    onOpenChange(false)
                },
                onError: (error) => {
                    setValidationError(error.message || 'Failed to create account and start trial')
                }
            })
        }
    }
    
    const handlePaidSubscription = async () => {
        const validation = user ? null : validateUserForm(formData)
        if (validation) {
            setValidationError(validation)
            return
        }
        
        if (!priceId) {
            setValidationError('Invalid plan configuration')
            return
        }
        
        if (user) {
            // Authenticated user - create subscription
            const requestBody = {
                planId,
                billingPeriod: getBillingPeriodUppercase(billingPeriod),
                userId: user.id,
                userEmail: user.email,
                userName: user.name || user.email,
                createAccount: false,
                paymentMethodCollection: 'always' as const
            }
            
            createSubscriptionMutation.mutate(requestBody, {
                onSuccess: async (data) => {
                    // For paid plans, we need to redirect to Stripe checkout
                    // The backend returns incomplete status for subscriptions requiring payment
                    if (data.status === 'INCOMPLETE' || data.clientSecret) {
                        await redirectToCheckout({
                            planId,
                            billingPeriod: getBillingPeriodUppercase(billingPeriod),
                            successUrl: `${window.location.origin}/dashboard?setup=success`,
                            cancelUrl: `${window.location.origin}/pricing`
                        })
                    } else {
                        // Subscription activated immediately (shouldn't happen for paid plans)
                        setShowSuccessModal(true)
                        onOpenChange(false)
                    }
                },
                onError: (error) => {
                    setValidationError(error.message || 'Failed to start subscription')
                }
            })
        } else {
            // New user - create account and subscription
            const requestBody = {
                planId,
                billingPeriod: getBillingPeriodUppercase(billingPeriod),
                userEmail: formData.email,
                userName: formData.name,
                createAccount: true,
                paymentMethodCollection: 'always' as const
            }
            
            createSubscriptionWithSignupMutation.mutate(requestBody, {
                onSuccess: (data) => {
                    // Store auth tokens
                    if (data.accessToken && data.refreshToken) {
                        localStorage.setItem('access_token', data.accessToken)
                        localStorage.setItem('refresh_token', data.refreshToken)
                    }
                    
                    // For new users with paid plans, show success and direct to login
                    // They'll complete payment setup after logging in
                    setShowSuccessModal(true)
                    onOpenChange(false)
                },
                onError: (error) => {
                    setValidationError(error.message || 'Failed to create account')
                }
            })
        }
    }
    
    const handleSubscribe = async () => {
        setValidationError(null)
        
        // FREE plan always uses trial flow
        if (planId === 'FREE') {
            await handleFreeTrial()
        } else {
            await handlePaidSubscription()
        }
    }
    
    const handleSuccessModalClose = () => {
        setShowSuccessModal(false)
        if (!user) {
            // Redirect new users to login
            window.location.href = `/auth/login?message=account-created&email=${encodeURIComponent(formData.email)}`
        } else {
            // Redirect existing users to dashboard
            window.location.href = '/dashboard?trial=started'
        }
    }
    
    const annualSavings = monthlyPrice > 0 
        ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
        : 0
    
    const isFreePlan = planId === 'FREE'
    const buttonText = isLoading 
        ? 'Processing...'
        : user 
            ? (isFreePlan ? 'Start Free Trial' : 'Continue to Payment')
            : `Start ${isFreePlan ? 'Free Trial' : '14-Day Trial'}${formData.name ? ` for ${formData.name}` : ''}`
    
    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="border-2 border-gray-200 bg-white text-gray-900 sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Subscribe to {plan.name}
                        </DialogTitle>
                        <DialogDescription className="text-gray-700">
                            {isFreePlan 
                                ? 'Start your free plan with no credit card required'
                                : 'Start your 14-day free trial with full access'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        {/* Plan Summary */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                <Badge variant="default" className="bg-blue-600 text-white">
                                    ${price}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{plan.description}</p>
                            
                            {billingPeriod === 'annual' && annualSavings > 0 && (
                                <div className="mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                        Save {annualSavings}% annually
                                    </Badge>
                                </div>
                            )}
                        </div>
                        
                        {/* User Information Form (for non-authenticated users) */}
                        {!user && (
                            <div className="space-y-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                                    <Mail className="h-4 w-4" />
                                    Create Your Account
                                </div>
                                <p className="text-sm text-blue-800">
                                    Enter your details to create your account and start your {isFreePlan ? 'free plan' : '14-day free trial'}.
                                </p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                                            Full Name
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Enter your full name"
                                            value={formData.name}
                                            onChange={handleFormChange('name')}
                                            className="mt-1 border-gray-300 bg-white text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={formData.email}
                                            onChange={handleFormChange('email')}
                                            className="mt-1 border-gray-300 bg-white text-gray-900"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="rounded border border-green-200 bg-green-50 p-3">
                                    <p className="text-xs text-green-800">
                                        {isFreePlan 
                                            ? '✅ No credit card required • ✅ Upgrade anytime'
                                            : '✅ 14-day free trial • ✅ Cancel anytime • ✅ Full access'}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Error Alert */}
                        {validationError && (
                            <Alert variant="destructive">
                                <AlertDescription>{validationError}</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Security Notice */}
                        <div className="text-muted-foreground text-center text-sm">
                            🔒 Secure checkout powered by Stripe
                        </div>
                        
                        {/* Submit Button */}
                        <Button
                            onClick={handleSubscribe}
                            disabled={isLoading || (!user && (!formData.email || !formData.name))}
                            className="w-full"
                            size="lg"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {buttonText}
                        </Button>
                        
                        {/* Features List */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">What's included:</h4>
                            <ul className="text-muted-foreground space-y-1 text-sm">
                                {plan.features && plan.features.slice(0, 4).map((feature, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <div className="bg-primary h-1 w-1 rounded-full" />
                                        {feature}
                                    </li>
                                ))}
                                {plan.features && plan.features.length > 4 && (
                                    <li className="text-xs">
                                        + {plan.features.length - 4} more features
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
                plan={plan}
                price={price}
                billingPeriod={billingPeriod}
                isNewUser={!user}
                isFreePlan={isFreePlan}
            />
        </>
    )
}

// Separate component for the success modal to keep things DRY
interface SuccessModalProps {
    isOpen: boolean
    onClose: () => void
    plan: Plan | undefined
    price: number
    billingPeriod: 'monthly' | 'annual'
    isNewUser: boolean
    isFreePlan: boolean
}

function SuccessModal({ 
    isOpen, 
    onClose, 
    plan, 
    price, 
    billingPeriod, 
    isNewUser,
    isFreePlan 
}: SuccessModalProps) {
    if (!plan) return null
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="border-2 border-gray-200 bg-white text-center sm:max-w-[500px]">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-200 bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold text-gray-900">
                        {isNewUser ? '🎉 Account Created Successfully!' : '🎉 Welcome to TenantFlow!'}
                    </DialogTitle>
                    <DialogDescription className="text-center text-lg text-gray-700">
                        {isNewUser 
                            ? 'Your account has been created! Please log in to continue.'
                            : isFreePlan
                                ? 'Your free plan is now active!'
                                : 'Your 14-day free trial has started successfully'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Plan Details */}
                    <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                        <div className="mb-2 flex items-center justify-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">
                                {isFreePlan ? plan.name : '14 Days Free'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700">
                            Full access to {plan.name} features • ${price}/
                            {billingPeriod === 'monthly' ? 'month' : 'year'}
                            {!isFreePlan && ' billing starts after trial'}
                        </p>
                    </div>
                    
                    {/* Billing Notice for paid plans */}
                    {!isFreePlan && price > 0 && (
                        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
                            <div className="flex items-start gap-2">
                                <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                                <div className="text-sm">
                                    <p className="mb-1 font-semibold text-gray-900">
                                        Payment Setup Required
                                    </p>
                                    <p className="text-gray-700">
                                        You'll be prompted to add a payment method. Your card will be charged ${price} on{' '}
                                        {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}{' '}
                                        when your trial ends.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* What's Next */}
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                        <h4 className="font-semibold text-gray-900">What happens next:</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                <span>
                                    {isNewUser 
                                        ? 'Log in with your email and password'
                                        : 'Access your property management dashboard'}
                                </span>
                            </div>
                            {!isFreePlan && (
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                    <span>Complete payment setup to secure your subscription</span>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                                <span>Start adding properties and managing tenants</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* CTA Button */}
                    <Button
                        onClick={onClose}
                        className="from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground w-full bg-gradient-to-r py-3 text-lg font-semibold"
                        size="lg"
                    >
                        {isNewUser ? 'Continue to Login' : 'Go to Dashboard'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    
                    {/* Terms Notice */}
                    <p className="text-muted-foreground text-center text-xs">
                        🔒 Secure • {!isFreePlan && price > 0 ? '💳 Payment setup required • ' : ''}✨ Cancel anytime
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}