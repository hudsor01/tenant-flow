'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { useUser } from '#hooks/api/use-auth'
import { API_BASE_URL } from '#lib/api-config'
import { cn } from '#lib/utils'
import type { CustomerPortalCardProps } from '@repo/shared/types/frontend'
import { useMutation } from '@tanstack/react-query'
import {
	Activity,
	ArrowRight,
	Award,
	Calendar,
	CheckCircle2,
	Clock,
	CreditCard,
	Download,
	FileText,
	Lock,
	Settings,
	Shield,
	Sparkles,
	Star,
	TrendingUp,
	Users,
	Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'
import {
	animationClasses,
	buttonClasses,
	cardClasses,
	TYPOGRAPHY_SCALE
} from '../../lib/design-system'

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
			// Check if user has Stripe customer ID
			if (!user?.stripe_customer_id) {
				router.push('/pricing')
				throw new Error('No active subscription found')
			}

			// Check if user is authenticated
			const authToken = localStorage.getItem('auth-token')
			if (!authToken) {
				window.location.href = '/login'
				throw new Error('Please sign in to access your account')
			}

			// Show loading toast
			toast.loading('Opening customer portal...', { id: 'portal' })

			// Create portal session - matches backend endpoint at stripe.controller.ts:855
			const response = await fetch(
				`${API_BASE_URL}/stripe/create-billing-portal`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${authToken}`
					},
					body: JSON.stringify({
						customerId: user.stripe_customer_id,
						returnUrl: window.location.href
					})
				}
			)

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to create portal session')
			}

			const { url } = await response.json()

			// Update toast and redirect
			toast.success('Redirecting to customer portal...', { id: 'portal' })

			// Redirect to Stripe Customer Portal
			window.location.href = url

			return { success: true }
		},
		onError: error => {
			handleMutationError(error, 'Access customer portal')
			toast.dismiss('portal')
		}
	})

	const handlePortalAccess = async () => {
		portalMutation.mutate()
	}

	// Show "Subscribe Now" if user has no Stripe customer
	if (!isLoadingUser && !user?.stripe_customer_id) {
		return (
			<Button
				variant={variant}
				size={size}
				className={cn(
					buttonClasses(
						variant as Parameters<typeof buttonClasses>[0],
						size as Parameters<typeof buttonClasses>[1]
					),
					'hover:scale-105 font-semibold',
					className
				)}
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
			className={cn(
				buttonClasses(
					variant as Parameters<typeof buttonClasses>[0],
					size as Parameters<typeof buttonClasses>[1]
				),
				'hover:scale-105 font-semibold',
				className
			)}
			onClick={handlePortalAccess}
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

export function CustomerPortalCard({
	className,
	showStats = true,
	showTestimonial = true,
	currentPlan = 'Growth Plan',
	planTier = 'enterprise',
	usageStats = {
		properties: 12,
		tenants: 48,
		uptime: '99.9%',
		monthlyRevenue: 24500,
		activeLeases: 42
	},
	billingInfo = {
		nextBillingDate: '2024-12-15',
		lastPayment: '2024-11-15',
		paymentMethod: 'Visa ending in 4242'
	},
	testimonial = {
		text: 'TenantFlow transformed our property management workflow. The billing portal saves us hours every month.',
		author: 'Sarah Johnson',
		company: 'Metro Properties',
		rating: 5
	}
}: CustomerPortalCardProps = {}) {
	// Plan tier configuration
	const tierConfig = {
		starter: {
			background: 'bg-primary',
			cardBg: 'bg-primary/5',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		growth: {
			background: 'bg-accent',
			cardBg: 'bg-accent/5',
			borderColor: 'border-accent/20',
			textColor: 'text-accent'
		},
		professional: {
			background: 'bg-primary',
			cardBg: 'bg-primary/5',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		tenantflow_max: {
			background: 'bg-primary',
			cardBg: 'bg-primary/5',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		enterprise: {
			background: 'bg-accent',
			cardBg: 'bg-accent/5',
			borderColor: 'border-accent/20',
			textColor: 'text-accent'
		}
	}

	const config =
		tierConfig[planTier as keyof typeof tierConfig] || tierConfig.starter

	return (
		<div className="space-y-[var(--spacing-6)]">
			{/* Main Account Card */}
			<CardLayout
				title="Account Management"
				description="Manage your subscription and billing preferences"
				className={cn(
					cardClasses('premium'),
					'shadow-2xl hover:shadow-3xl border-2 bg-background',
					'relative overflow-hidden',
					animationClasses('fade-in'),
					className
				)}
			>
				<div className="absolute inset-0 bg-primary/5 opacity-50" />

				<div className="flex items-center justify-between mb-[var(--spacing-6)]">
					<div className="flex items-center gap-[var(--spacing-4)]">
						<div
							className={cn(
								'p-[var(--spacing-4)] rounded-2xl gradient-background shadow-lg'
							)}
						>
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

					{/* Plan Badge */}
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
						<div className="flex items-center gap-[var(--spacing-2)] mt-2">
							<div className="size-2 bg-primary rounded-full animate-pulse" aria-hidden="true" />
							<span className="text-xs text-muted-foreground font-medium">
								Active Plan
							</span>
						</div>
					</div>
				</div>

				<div
					className={cn(
						'relative z-10 space-y-[var(--spacing-8)]',
						animationClasses('slide-up')
					)}
				>
					{/* Enhanced Usage Stats */}
					{showStats && (
						<div className="bg-muted/10 rounded-2xl p-[var(--spacing-6)] border-2 border-muted/20">
							<div className="flex items-center justify-between mb-[var(--spacing-6)]">
								<h4
									className="text-foreground flex items-center gap-[var(--spacing-3)]"
									style={TYPOGRAPHY_SCALE['heading-md']}
								>
									<div className="p-[var(--spacing-2)] bg-primary/10 rounded-lg">
										<Activity className="size-5 text-primary" />
									</div>
									Monthly Overview
								</h4>
								<Badge variant="outline" className="text-xs font-medium">
									<Clock className="size-3 mr-1" />
									Updated 2 hours ago
								</Badge>
							</div>
								<div className="grid gap-[var(--spacing-6)] [grid-template-columns:var(--layout-grid-cols-2)] lg:[grid-template-columns:var(--layout-grid-cols-5)]">
								<div className="text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30">
									<div className="size-[var(--spacing-10)] bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]">
										<FileText className="size-5 text-accent" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.properties}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Properties
									</p>
								</div>
								<div className="text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30">
									<div className="size-[var(--spacing-10)] bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]">
										<Users className="size-5 text-primary" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.tenants}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Tenants
									</p>
								</div>
								<div className="text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30">
									<div className="size-[var(--spacing-10)] bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]">
										<Zap className="size-5 text-primary" />
									</div>
									<p className="text-2xl font-black text-primary tabular-nums">
										{usageStats.uptime}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Uptime
									</p>
								</div>
								{usageStats.monthlyRevenue && (
									<div className="text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30">
										<div className="size-[var(--spacing-10)] bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]">
											<TrendingUp className="size-5 text-primary" />
										</div>
										<p className="text-2xl font-black text-primary tabular-nums">
											${usageStats.monthlyRevenue.toLocaleString()}
										</p>
										<p className="text-xs text-muted-foreground font-medium">
											Revenue
										</p>
									</div>
								)}
								{usageStats.activeLeases && (
									<div className="text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30">
										<div className="size-[var(--spacing-10)] bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]">
											<FileText className="size-5 text-accent" />
										</div>
										<p className="text-2xl font-black text-accent tabular-nums">
											{usageStats.activeLeases}
										</p>
										<p className="text-xs text-muted-foreground font-medium">
											Active Leases
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Billing Information */}
					{billingInfo && (
						<div className="bg-accent/8 rounded-2xl p-[var(--spacing-6)] border border-accent/20">
							<div className="flex items-center justify-between mb-[var(--spacing-6)]">
								<h4
									className="text-foreground flex items-center gap-[var(--spacing-3)]"
									style={TYPOGRAPHY_SCALE['heading-md']}
								>
									<div className="p-[var(--spacing-2)] bg-accent/10 rounded-lg">
										<CreditCard className="size-5 text-accent" />
									</div>
									Billing Information
								</h4>
								<Badge className="bg-primary/10 text-primary border-primary/20">
									<Lock className="size-3 mr-1" />
									Secured
								</Badge>
							</div>

							<div className="grid gap-[var(--spacing-4)] [grid-template-columns:var(--layout-grid-cols-1)] md:[grid-template-columns:var(--layout-grid-cols-3)]">
								{billingInfo.nextBillingDate && (
									<div className="bg-background/70 rounded-lg p-[var(--spacing-4)] border border-primary/20">
										<div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-2)]">
											<Calendar className="size-4 text-primary" />
											<span className="text-sm font-semibold text-muted-foreground">
												Next Billing
											</span>
										</div>
										<p className="font-bold text-foreground">
											{new Date(billingInfo.nextBillingDate).toLocaleDateString(
												'en-US',
												{
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												}
											)}
										</p>
									</div>
								)}
								{billingInfo.lastPayment && (
									<div className="bg-background/70 rounded-lg p-[var(--spacing-4)] border-primary/20">
										<div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-2)]">
											<CheckCircle2 className="size-4 text-accent" />
											<span className="text-sm font-semibold text-muted-foreground">
												Last Payment
											</span>
										</div>
										<p className="font-bold text-foreground">
											{new Date(billingInfo.lastPayment).toLocaleDateString(
												'en-US',
												{
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												}
											)}
										</p>
									</div>
								)}
								{billingInfo.paymentMethod && (
									<div className="bg-background/70 rounded-lg p-[var(--spacing-4)] border-primary/20">
										<div className="flex items-center gap-[var(--spacing-2)] mb-[var(--spacing-2)]">
											<CreditCard className="size-4 text-primary" />
											<span className="text-sm font-semibold text-muted-foreground">
												Payment Method
											</span>
										</div>
										<p className="font-bold text-foreground">
											{billingInfo.paymentMethod}
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Enhanced Description */}
					<div className="text-center space-y-[var(--spacing-4)]">
						<p className="text-muted-foreground leading-relaxed max-w-[var(--max-width-3xl)] mx-auto text-base">
							Manage your subscription, update payment methods, view invoices,
							download reports, and access all billing features in our secure,
							enterprise-grade customer portal.
						</p>

						{showTestimonial && testimonial && (
							<div className="bg-primary/8 rounded-2xl p-[var(--spacing-6)] border-2 border-primary/20 max-w-[var(--max-width-2xl)] mx-auto">
								<div className="flex items-center justify-center gap-[var(--spacing-1)] mb-[var(--spacing-4)]">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star key={i} className="size-4 fill-accent text-accent" />
									))}
									<span className="ml-2 text-sm font-bold text-primary">
										{testimonial.rating}/5
									</span>
								</div>
								<blockquote className="text-foreground text-center leading-relaxed font-medium">
									&quot;{testimonial.text}&quot;
								</blockquote>
								<div className="flex items-center justify-center gap-[var(--spacing-3)] mt-[var(--spacing-4)] pt-[var(--spacing-4)] border-t border-primary/10">
									<div className="size-[var(--spacing-10)] bg-primary/15 rounded-full flex items-center justify-center">
										<Users className="size-5 text-primary" />
									</div>
									<cite className="text-sm font-bold text-foreground not-italic">
										{testimonial.author}
										<span className="text-muted-foreground font-medium block">
											{testimonial.company}
										</span>
									</cite>
								</div>
							</div>
						)}
					</div>

					{/* Enhanced Feature Grid */}
					<div
						className={cn(
						'grid gap-[var(--spacing-4)] [grid-template-columns:var(--layout-grid-cols-1)] lg:[grid-template-columns:var(--layout-grid-cols-2)]',
							animationClasses('fade-in')
						)}
					>
						<div className="group p-[var(--spacing-5)] bg-primary/8 rounded-2xl border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-[var(--spacing-4)] mb-[var(--spacing-3)]">
								<div className="p-[var(--spacing-3)] bg-primary/10 rounded-xl">
									<CreditCard className="size-6 text-primary" />
								</div>
								<div>
									<h5 className="font-bold text-foreground">
										Payment Management
									</h5>
									<p className="text-sm text-muted-foreground">
										Update cards & billing info
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-primary font-medium">
									Secure & instant updates
								</span>
								<ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-[var(--spacing-5)] bg-accent/8 rounded-2xl border-2 border-accent/20 hover:border-accent/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-[var(--spacing-4)] mb-[var(--spacing-3)]">
								<div className="p-[var(--spacing-3)] bg-accent/10 rounded-xl">
									<FileText className="size-6 text-accent" />
								</div>
								<div>
									<h5 className="font-bold text-foreground">
										Invoices & Receipts
									</h5>
									<p className="text-sm text-muted-foreground">
										Download & track payments
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-accent font-medium">
									Instant PDF downloads
								</span>
								<ArrowRight className="size-5 text-accent group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-[var(--spacing-5)] bg-primary/8 rounded-2xl border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-[var(--spacing-4)] mb-[var(--spacing-3)]">
								<div className="p-[var(--spacing-3)] bg-primary/10 rounded-xl">
									<Download className="size-6 text-primary" />
								</div>
								<div>
									<h5 className="font-bold text-foreground">Usage Reports</h5>
									<p className="text-sm text-muted-foreground">
										Analytics & insights
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-primary font-medium">
									Detailed breakdowns
								</span>
								<ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-[var(--spacing-5)] bg-accent/8 rounded-2xl border-2 border-accent/20 hover:border-accent/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-[var(--spacing-4)] mb-[var(--spacing-3)]">
								<div className="p-[var(--spacing-3)] bg-accent/10 rounded-xl">
									<Sparkles className="size-6 text-accent" />
								</div>
								<div>
									<h5 className="font-bold text-foreground">Plan Management</h5>
									<p className="text-sm text-muted-foreground">
										Upgrade, downgrade or cancel
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-accent font-medium">
									Flexible changes
								</span>
								<ArrowRight className="size-5 text-accent group-hover:translate-x-1 transition-transform" />
							</div>
						</div>
					</div>

					{/* Enhanced Primary Action */}
					<div className={cn('pt-[var(--spacing-4)]', animationClasses('slide-up'))}>
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

			{/* Enhanced Trust Signals */}
			<div className="bg-muted/10 rounded-2xl p-[var(--spacing-6)] border-2 border-muted/20">
				<div className="flex flex-wrap items-center justify-center gap-[var(--spacing-6)] text-sm">
					<div className="flex items-center gap-[var(--spacing-3)]">
						<div className="p-[var(--spacing-2)] bg-accent/10 rounded-lg">
							<Shield className="size-5 text-accent" />
						</div>
						<div>
							<p className="font-bold text-foreground">Bank-Level Security</p>
							<p className="text-xs text-muted-foreground">
								256-bit SSL encryption
							</p>
						</div>
					</div>
					<div className="flex items-center gap-[var(--spacing-3)]">
						<div className="p-[var(--spacing-2)] bg-primary/10 rounded-lg">
							<CheckCircle2 className="size-5 text-primary" />
						</div>
						<div>
							<p className="font-bold text-foreground">Powered by Stripe</p>
							<p className="text-xs text-muted-foreground">
								Trusted by millions
							</p>
						</div>
					</div>
					<div className="flex items-center gap-[var(--spacing-3)]">
						<div className="p-[var(--spacing-2)] bg-primary/10 rounded-lg">
							<Users className="size-5 text-primary" />
						</div>
						<div>
							<p className="font-bold text-foreground">10,000+ Managers</p>
							<p className="text-xs text-muted-foreground">Growing community</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
