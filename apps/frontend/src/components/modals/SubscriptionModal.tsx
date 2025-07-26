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
import { getPlanById } from '@/lib/subscription-utils'
import type { Plan } from '@/types/subscription'
import type { PlanType } from '@/types/prisma-types'
import { useAuth } from '@/hooks/useApiAuth'
import {
	useCreateSubscription
} from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'
import { CheckoutModal } from '@/components/stripe/CheckoutModal'
import { 
	validateUserForm, 
	calculateAnnualPrice, 
	calculateAnnualSavings, 
	createAuthLoginUrl,
	SUBSCRIPTION_URLS,
	type UserFormData 
} from '@/lib/subscription-utils'
import { useMultiModalState } from '@/hooks/useModalState'

interface SubscriptionModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	planId: PlanType
	billingPeriod: 'MONTHLY' | 'ANNUAL'
	stripePriceId: string | undefined // New prop for the specific Stripe Price ID
}



export default function SubscriptionModal({
	isOpen,
	onOpenChange,
	planId,
	billingPeriod,
	stripePriceId
}: SubscriptionModalProps) {
	// Modal state management
	const modals = useMultiModalState(['success', 'checkout'] as const)
	const [clientSecret, setClientSecret] = useState<string | null>(null)
	const [formData, setFormData] = useState<UserFormData>({
		email: '',
		fullName: '',
		password: ''
	})
	const [validationError, setValidationError] = useState<string | null>(null)

	const { user } = useAuth()
	const { startTrial, isLoading: isCheckoutLoading } = useCheckout()

	const createSubscriptionMutation = useCreateSubscription()

	const plan = getPlanById(planId)
	if (!plan) return null

	// Calculate prices based on billing period
	const monthlyPrice = plan.price
	const annualPrice = calculateAnnualPrice(monthlyPrice)
	const price = billingPeriod === 'MONTHLY' ? monthlyPrice : annualPrice

	const isLoading =
		createSubscriptionMutation.isPending ||
		isCheckoutLoading

	const handleFormChange =
		(field: keyof UserFormData) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
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
			try {
				await startTrial({
					onSuccess: () => {
						modals.success.open()
						onOpenChange(false)
					}
				})
			} catch (error) {
				setValidationError(
					error instanceof Error ? error.message : 'Failed to start trial'
				)
			}
		} else {
			// New user - create account and start trial
			// TODO: Implement createSubscriptionWithSignup functionality
			// This requires creating the account first, then starting the trial
			setValidationError('Please sign up first, then start your trial from the dashboard')
		}
	}

	const handlePaidSubscription = async () => {
		const validation = user ? null : validateUserForm(formData)
		if (validation) {
			setValidationError(validation)
			return
		}

		if (!stripePriceId) {
			setValidationError('Invalid plan configuration')
			return
		}

		if (user) {
			// Authenticated user - create checkout session
			const requestBody = {
				planType: planId,
				billingInterval: (billingPeriod === 'MONTHLY' ? 'monthly' : 'annual') as 'monthly' | 'annual',
				successUrl: `${window.location.origin}/dashboard?subscription=success`,
				cancelUrl: `${window.location.origin}/pricing`,
				uiMode: 'embedded' as const
			}

			interface CreateSubscriptionRequestBody {
				planType: PlanType
				billingInterval: 'monthly' | 'annual'
				successUrl: string
				cancelUrl: string
				uiMode: 'embedded'
			}

			interface CreateSubscriptionResponse {
				clientSecret?: string
				url?: string
			}

			createSubscriptionMutation.mutate(
				requestBody as CreateSubscriptionRequestBody,
				{
					onSuccess: async (data: CreateSubscriptionResponse) => {
						// For paid plans, the backend returns a clientSecret for embedded checkout
						if (data.clientSecret) {
							setClientSecret(data.clientSecret)
							modals.checkout.open()
						} else if (data.url) {
							// If we get a URL instead, redirect to hosted checkout
							window.location.href = data.url
						} else {
							// Subscription activated immediately (shouldn't happen for paid plans)
							modals.success.open()
							onOpenChange(false)
						}
					},
					onError: (error: unknown) => {
						const typedError = error as Error
						setValidationError(
							typedError.message || 'Failed to start subscription'
						)
					}
				}
			)
		} else {
			// New user - create account and subscription
			// TODO: Implement createSubscriptionWithSignup functionality for paid plans
			// This requires creating the account first, then redirecting to checkout
			setValidationError('Please sign up first, then subscribe from the dashboard')
		}
	}

	const handlePaymentSuccess = () => {
		modals.checkout.close()
		setClientSecret(null)
		modals.success.open()
	}

	const handlePaymentError = (error: string) => {
		setValidationError(error)
		modals.checkout.close()
		setClientSecret(null)
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
		modals.success.close()
		if (!user) {
			// Redirect new users to login
			window.location.href = createAuthLoginUrl(formData.email)
		} else {
			// Redirect existing users to dashboard
			window.location.href = SUBSCRIPTION_URLS.dashboardWithTrial
		}
	}

	const annualSavings = calculateAnnualSavings(monthlyPrice)

	const isFreePlan = planId === 'FREE'
	const buttonText = isLoading
		? 'Processing...'
		: user
			? isFreePlan
				? 'Start Free Trial'
				: 'Continue to Payment'
			: `Start ${isFreePlan ? 'Free Trial' : '14-Day Trial'}${formData.fullName ? ` for ${formData.fullName}` : ''}`

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className="border-0 bg-white shadow-2xl overflow-hidden sm:max-w-[500px]">
					<div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-50" />
					<div className="relative">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
								<div className="p-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg">
									<CreditCard className="h-6 w-6 text-blue-600" />
								</div>
								Subscribe to {plan.name}
							</DialogTitle>
							<DialogDescription className="text-gray-600 text-base">
								{isFreePlan
									? 'Start your free plan with no credit card required'
									: 'Start your 14-day free trial with full access'}
							</DialogDescription>
						</DialogHeader>

					<div className="space-y-6 mt-6">
						{/* Plan Summary */}
						<div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 border border-blue-200/50">
							<div className="mb-3 flex items-center justify-between">
								<h3 className="font-bold text-gray-900 text-lg">
									{plan.name}
								</h3>
								<Badge
									variant="default"
									className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-4 py-1 text-base font-semibold shadow-md"
								>
									${price}/
									{billingPeriod === 'MONTHLY' ? 'mo' : 'yr'}
								</Badge>
							</div>
							<p className="text-gray-600 leading-relaxed">
								{plan.description}
							</p>

							{billingPeriod === 'ANNUAL' &&
								annualSavings > 0 && (
									<div className="mt-3">
										<Badge
											variant="secondary"
											className="bg-green-100 text-green-700 border-green-200 px-3 py-1"
										>
											💰 Save {annualSavings}% annually
										</Badge>
									</div>
								)}
						</div>

						{/* User Information Form (for non-authenticated users) */}
						{!user && (
							<div className="space-y-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border border-blue-200/30">
								<div className="flex items-center gap-2">
									<div className="p-2 bg-white rounded-lg shadow-sm">
										<Mail className="h-5 w-5 text-blue-600" />
									</div>
									<h3 className="font-semibold text-gray-900">
										Create Your Account
									</h3>
								</div>
								<p className="text-gray-600">
									Enter your details to create your account
									and start your{' '}
									{isFreePlan
										? 'free plan'
										: '14-day free trial'}
									.
								</p>

								<div className="space-y-4">
									<div>
										<Label
											htmlFor="name"
											className="text-sm font-medium text-gray-700 mb-1.5 block"
										>
											Full Name
										</Label>
										<Input
											id="name"
											type="text"
											placeholder="Enter your full name"
											value={formData.fullName}
											onChange={handleFormChange('fullName')}
											className="border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											required
										/>
									</div>
									<div>
										<Label
											htmlFor="email"
											className="text-sm font-medium text-gray-700 mb-1.5 block"
										>
											Email Address
										</Label>
										<Input
											id="email"
											type="email"
											placeholder="Enter your email address"
											value={formData.email}
											onChange={handleFormChange('email')}
											className="border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
											required
										/>
									</div>
								</div>

								<div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3">
									<p className="text-sm text-green-700 font-medium">
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
								<AlertDescription>
									{validationError}
								</AlertDescription>
							</Alert>
						)}

						{/* Security Notice */}
						<div className="text-center">
							<p className="text-sm text-gray-500 flex items-center justify-center gap-2">
								<span className="text-lg">🔒</span>
								<span>Secure checkout powered by Stripe</span>
							</p>
						</div>

						{/* Submit Button */}
						<Button
							onClick={handleSubscribe}
							disabled={
								isLoading ||
								(!user && (!formData.email || !formData.fullName))
							}
							className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
							size="lg"
						>
							{isLoading && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							{buttonText}
						</Button>

						{/* Features List */}
						<div className="space-y-3 rounded-xl bg-gray-50 p-4">
							<h4 className="text-sm font-semibold text-gray-900">
								What's included:
							</h4>
							<ul className="space-y-2">
								{plan.features &&
									plan.features
										.slice(0, 4)
										.map((feature, index) => (
											<li
												key={index}
												className="flex items-start gap-2 text-sm text-gray-600"
											>
												<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
												<span>{feature}</span>
											</li>
										))}
								{plan.features && plan.features.length > 4 && (
									<li className="text-sm text-blue-600 font-medium pl-6">
										+ {plan.features.length - 4} more features
									</li>
								)}
							</ul>
						</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Checkout Modal */}
			<CheckoutModal
				isOpen={modals.checkout.isOpen}
				onOpenChange={open => open ? modals.checkout.open() : modals.checkout.close()}
				clientSecret={clientSecret}
				onSuccess={handlePaymentSuccess}
				onError={handlePaymentError}
				title={`Complete ${plan.name} Subscription`}
				description={`Secure payment for ${plan.name} subscription`}
				returnUrl={`${window.location.origin}${SUBSCRIPTION_URLS.dashboardWithSetup}`}
			/>

			{/* Success Modal */}
			<SuccessModal
				isOpen={modals.success.isOpen}
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
	billingPeriod: 'MONTHLY' | 'ANNUAL'
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
			<DialogContent className="border-0 bg-white shadow-2xl text-center sm:max-w-[500px] overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 opacity-50" />
				<div className="relative">
					<DialogHeader>
						<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg">
							<CheckCircle className="h-10 w-10 text-white" />
						</div>
						<DialogTitle className="text-center text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
							{isNewUser
								? '🎉 Account Created Successfully!'
								: '🎉 Welcome to TenantFlow!'}
						</DialogTitle>
						<DialogDescription className="text-center text-lg text-gray-600 mt-2">
							{isNewUser
								? 'Your account has been created! Please log in to continue.'
								: isFreePlan
									? 'Your free plan is now active!'
									: 'Your 14-day free trial has started successfully'}
						</DialogDescription>
					</DialogHeader>

				<div className="space-y-6 mt-8">
					{/* Plan Details */}
					<div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 border border-blue-200/50">
						<div className="mb-3 flex items-center justify-center gap-3">
							<div className="p-2 bg-white rounded-lg shadow-sm">
								<Calendar className="h-5 w-5 text-blue-600" />
							</div>
							<span className="font-bold text-gray-900 text-lg">
								{isFreePlan ? plan.name : '14 Days Free'}
							</span>
						</div>
						<p className="text-gray-600">
							Full access to {plan.name} features • <span className="font-semibold">${price}/{billingPeriod === 'MONTHLY' ? 'month' : 'year'}</span>
							{!isFreePlan && ' billing starts after trial'}
						</p>
					</div>

					{/* Billing Notice for paid plans */}
					{!isFreePlan && price > 0 && (
						<div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-4">
							<div className="flex items-start gap-3">
								<div className="p-2 bg-white rounded-lg shadow-sm">
									<CreditCard className="h-4 w-4 text-amber-600" />
								</div>
								<div className="text-sm text-left">
									<p className="mb-1 font-semibold text-gray-900">
										Payment Setup Required
									</p>
									<p className="text-gray-600">
										You'll be prompted to add a payment
										method. Your card will be charged{' '}
										<span className="font-semibold">${price}</span> on{' '}
										<span className="font-medium">
											{new Date(
												Date.now() +
													14 * 24 * 60 * 60 * 1000
											).toLocaleDateString()}
										</span>{' '}
										when your trial ends.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* What's Next */}
					<div className="space-y-3 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/50 p-5 text-left">
						<h4 className="font-semibold text-gray-900 flex items-center gap-2">
							<span>What happens next:</span>
						</h4>
						<div className="space-y-3">
							<div className="flex items-start gap-3">
								<div className="mt-0.5 p-1 bg-green-100 rounded-full">
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								<span className="text-sm text-gray-600">
									{isNewUser
										? 'Log in with your email and password'
										: 'Access your property management dashboard'}
								</span>
							</div>
							{!isFreePlan && (
								<div className="flex items-start gap-3">
									<div className="mt-0.5 p-1 bg-green-100 rounded-full">
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>
									<span className="text-sm text-gray-600">
										Complete payment setup to secure your
										subscription
									</span>
								</div>
							)}
							<div className="flex items-start gap-3">
								<div className="mt-0.5 p-1 bg-green-100 rounded-full">
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								<span className="text-sm text-gray-600">
									Start adding properties and managing tenants
								</span>
							</div>
						</div>
					</div>

					{/* CTA Button */}
					<Button
						onClick={onClose}
						className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 py-6 text-lg font-semibold"
						size="lg"
					>
						{isNewUser ? 'Continue to Login' : 'Go to Dashboard'}
						<ArrowRight className="ml-2 h-5 w-5" />
					</Button>

					{/* Terms Notice */}
					<p className="text-center text-xs text-gray-500 flex items-center justify-center gap-3">
						<span>🔒 Secure</span>
						{!isFreePlan && price > 0 && (
							<>
								<span>•</span>
								<span>💳 Payment setup required</span>
							</>
						)}
						<span>•</span>
						<span>✨ Cancel anytime</span>
					</p>
				</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
