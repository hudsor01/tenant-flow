'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { useUser } from '#hooks/api/use-auth'
import { API_BASE_URL } from '#lib/api-config'
import { createClient } from '#lib/supabase/client'
import { cn } from '#lib/utils'
import { useMutation } from '@tanstack/react-query'
import { cardVariants } from '#components/ui/card'
import { TYPOGRAPHY_SCALE } from '@repo/shared/constants/design-system'
import {
	ArrowRight,
	Award,
	Settings,
	Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'
import {
	PortalUsageStats,
	type UsageStatsData
} from './portal-usage-stats'
import {
	PortalBillingInfo,
	type BillingInfoData
} from './portal-billing-info'
import { PortalTestimonial, type TestimonialData } from './portal-testimonial'
import { PortalFeatureGrid } from './portal-feature-grid'
import { PortalTrustSignals } from './portal-trust-signals'

interface CustomerPortalCardProps {
	className?: string
	showStats?: boolean
	showTestimonial?: boolean
	currentPlan?: string
	planTier?: string
	usageStats?: UsageStatsData
	billingInfo?: BillingInfoData
	testimonial?: TestimonialData
}

export function CustomerPortalButton({
	variant = 'outline',
	size = 'default',
	className,
	children,
	...props
}: ComponentProps<typeof Button>) {
	const router = useRouter()
	const { data: user, isLoading: isLoadingUser } = useUser()

	const portalMutation = useMutation({
		mutationFn: async () => {
			if (!user?.stripe_customer_id) {
				router.push('/pricing')
				throw new Error('No active subscription found')
			}

			const supabase = createClient()
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.access_token) {
				window.location.href = '/login'
				throw new Error('Please sign in to access your account')
			}

			toast.loading('Opening customer portal...', { id: 'portal' })

			const response = await fetch(
				`${API_BASE_URL}/stripe/create-billing-portal-session`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`
					}
				}
			)

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to create portal session')
			}

			const { url } = await response.json()
			toast.success('Redirecting to customer portal...', { id: 'portal' })
			window.location.href = url
			return { success: true }
		},
		onError: error => {
			handleMutationError(error, 'Access customer portal')
			toast.dismiss('portal')
		}
	})

	if (!isLoadingUser && !user?.stripe_customer_id) {
		return (
			<Button
				variant={variant}
				size={size}
				className={cn('hover:scale-105 font-semibold', className)}
				onClick={() => router.push('/pricing')}
				{...props}
			>
				<Sparkles className="size-4 mr-2" />
				Subscribe Now
			</Button>
		)
	}

	return (
		<Button
			variant={variant}
			size={size}
			className={cn('hover:scale-105 font-semibold', className)}
			onClick={() => portalMutation.mutate()}
			disabled={portalMutation.isPending}
			{...props}
		>
			{children || (
				<>
					<Settings className="size-4 mr-2" />
					{portalMutation.isPending ? 'Loading...' : 'Manage Subscription'}
				</>
			)}
		</Button>
	)
}

const TIER_CONFIG = {
	starter: {
		cardBg: 'bg-primary/5',
		borderColor: 'border-primary/20',
		textColor: 'text-primary'
	},
	growth: {
		cardBg: 'bg-accent/5',
		borderColor: 'border-accent/20',
		textColor: 'text-accent'
	},
	professional: {
		cardBg: 'bg-primary/5',
		borderColor: 'border-primary/20',
		textColor: 'text-primary'
	},
	tenantflow_max: {
		cardBg: 'bg-primary/5',
		borderColor: 'border-primary/20',
		textColor: 'text-primary'
	},
	enterprise: {
		cardBg: 'bg-accent/5',
		borderColor: 'border-accent/20',
		textColor: 'text-accent'
	}
} as const

const DEFAULT_USAGE_STATS: UsageStatsData = {
	properties: 12,
	tenants: 48,
	uptime: '99.9%',
	monthlyRevenue: 24500,
	activeLeases: 42
}

const DEFAULT_BILLING_INFO: BillingInfoData = {
	nextBillingDate: '2024-12-15',
	lastPayment: '2024-11-15',
	paymentMethod: 'Visa ending in 4242'
}

const DEFAULT_TESTIMONIAL: TestimonialData = {
	text: 'TenantFlow transformed our property management workflow. The billing portal saves us hours every month.',
	author: 'Sarah Johnson',
	company: 'Metro Properties',
	rating: 5
}

export function CustomerPortalCard({
	className,
	showStats = true,
	showTestimonial = true,
	currentPlan = 'Growth Plan',
	planTier = 'enterprise',
	usageStats = DEFAULT_USAGE_STATS,
	billingInfo = DEFAULT_BILLING_INFO,
	testimonial = DEFAULT_TESTIMONIAL
}: CustomerPortalCardProps = {}) {
	const config =
		TIER_CONFIG[planTier as keyof typeof TIER_CONFIG] || TIER_CONFIG.starter

	return (
		<div className="space-y-6">
			<CardLayout
				title="Account Management"
				description="Manage your subscription and billing preferences"
				className={cn(
					cardVariants({ variant: 'premium' }),
					'shadow-2xl hover:shadow-3xl border-2 bg-background',
					'relative overflow-hidden',
					'animate-in fade-in-0 duration-300',
					className
				)}
			>
				<div className="absolute inset-0 bg-primary/5 opacity-50" />

				<div className="flex-between mb-6">
					<div className="flex items-center gap-4">
						<div className="p-4 rounded-2xl gradient-background shadow-lg">
							<Settings className="size-8 text-primary-foreground" />
						</div>
						<div>
							<h3 className="font-bold tracking-tight text-foreground text-xl leading-tight">
								Account Management
							</h3>
							<p
								className="text-muted-foreground"
								style={TYPOGRAPHY_SCALE['ui-caption']}
							>
								Manage your subscription and billing preferences
							</p>
						</div>
					</div>

					<div className="text-right">
						<Badge
							className={cn(
								'px-4 py-2 text-sm font-bold border-2',
								config.cardBg,
								config.borderColor,
								config.textColor
							)}
						>
							<Award className="size-4 mr-2" />
							{currentPlan}
						</Badge>
						<div className="flex items-center gap-2 mt-2">
							<div
								className="size-2 bg-primary rounded-full animate-pulse"
								aria-hidden="true"
							/>
							<span className="text-caption font-medium">Active Plan</span>
						</div>
					</div>
				</div>

				<div className="relative z-10 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
					{showStats && <PortalUsageStats stats={usageStats} />}

					{billingInfo && <PortalBillingInfo billingInfo={billingInfo} />}

					<div className="text-center space-y-4">
						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-base">
							Manage your subscription, update payment methods, view invoices,
							download reports, and access all billing features in our secure,
							enterprise-grade customer portal.
						</p>

						{showTestimonial && testimonial && (
							<PortalTestimonial testimonial={testimonial} />
						)}
					</div>

					<PortalFeatureGrid />

					<div className="pt-4 animate-in slide-in-from-bottom-2 duration-300">
						<CustomerPortalButton
							className={cn(
								'w-full h-16 text-lg font-bold shadow-xl hover:shadow-2xl',
								'gradient-background',
								'hover:from-primary/90 hover:via-primary/95 hover:to-primary/80',
								'transform hover:scale-[1.02] active:scale-[0.98]',
								'border-2 border-primary/20'
							)}
							size="lg"
							variant="default"
						>
							<Settings className="size-6 mr-3" />
							Access Customer Portal
							<ArrowRight className="size-5 ml-3" />
						</CustomerPortalButton>
					</div>
				</div>
			</CardLayout>

			<PortalTrustSignals />
		</div>
	)
}
