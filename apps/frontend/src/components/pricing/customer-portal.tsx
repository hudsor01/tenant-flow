'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-client'
import {
	ANIMATION_DURATIONS,
	animationClasses,
	buttonClasses,
	cardClasses,
	cn,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
// Extended interface for customer portal with additional properties
interface ExtendedCustomerPortalCardProps
	extends Omit<
		CustomerPortalCardProps,
		'usageStats' | 'billingInfo' | 'testimonial'
	> {
	usageStats?: {
		properties?: number
		tenants?: number
		leases?: number
		maintenance?: number
		uptime?: string
		monthlyRevenue?: number
		activeLeases?: number
	}
	billingInfo?: {
		nextBillingDate?: string
		billingAmount?: number
		billingCycle?: string
		lastPayment?: string
		paymentMethod?: string
	}
	testimonial?: {
		quote?: string
		text?: string
		author?: string
		company?: string
		rating?: number
	}
}

import type { CustomerPortalCardProps } from '@repo/shared'
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
import type { ComponentProps } from 'react'
import { toast } from 'sonner'

export function CustomerPortalButton({
	variant = 'outline',
	size = 'default',
	className,
	children,
	...props
}: ComponentProps<typeof Button>) {
	const portalMutation = useMutation({
		mutationFn: async () => {
			// Check if user is authenticated
			const authToken = localStorage.getItem('auth-token')
			if (!authToken) {
				window.location.href = '/login'
				throw new Error('Please sign in to access your account')
			}

			// Show loading toast
			toast.loading('Opening customer portal...', { id: 'portal' })

			// Create portal session
			const response = await fetch(`${API_BASE_URL}/stripe/portal`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`
				},
				body: JSON.stringify({
					returnUrl: window.location.href
				})
			})

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
			toast.error(
				`Failed to access portal: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ id: 'portal' }
			)
		}
	})

	const handlePortalAccess = async () => {
		portalMutation.mutate()
	}

	return (
		<Button
			variant={variant}
			size={size}
			className={cn(
				// Use the inferred parameter types from buttonClasses to avoid unsafe 'unknown' casts
				buttonClasses(
					variant as Parameters<typeof buttonClasses>[0],
					size as Parameters<typeof buttonClasses>[1]
				),
				'hover:scale-105 font-semibold',
				className
			)}
			onClick={handlePortalAccess}
			disabled={portalMutation.isPending}
			style={{}}
			{...props}
		>
			{children || (
				<>
					<Settings className="w-4 h-4 mr-2" />
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
}: ExtendedCustomerPortalCardProps) {
	// Plan tier configuration
	const tierConfig = {
		starter: {
			gradient: 'from-primary to-primary',
			bgGradient: 'from-primary/5 to-primary/10',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		growth: {
			gradient: 'from-accent to-accent',
			bgGradient: 'from-accent/5 to-accent/10',
			borderColor: 'border-accent/20',
			textColor: 'text-accent'
		},
		professional: {
			gradient: 'from-primary to-primary',
			bgGradient: 'from-primary/5 to-primary/10',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		tenantflow_max: {
			gradient: 'from-primary to-primary',
			bgGradient: 'from-primary/5 to-primary/10',
			borderColor: 'border-primary/20',
			textColor: 'text-primary'
		},
		enterprise: {
			gradient: 'from-accent to-accent',
			bgGradient: 'from-accent/5 to-accent/10',
			borderColor: 'border-accent/20',
			textColor: 'text-accent'
		}
	}

	const config =
		tierConfig[planTier as keyof typeof tierConfig] || tierConfig.starter

	return (
		<div className="space-y-6">
			{/* Main Account Card */}
			<Card
				className={cn(
					cardClasses('premium'),
					'shadow-2xl hover:shadow-3xl border-2 bg-gradient-to-br from-background via-muted/5 to-background',
					'relative overflow-hidden',
					animationClasses('fade-in'),
					className
				)}
				style={{
					transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
				}}
			>
				{/* Background Pattern */}
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />

				<CardHeader
					className={cn('relative z-10', animationClasses('slide-down'))}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									'p-4 rounded-2xl bg-gradient-to-br shadow-lg',
									config.gradient
								)}
							>
								<Settings className="w-8 h-8 text-primary-foreground" />
							</div>
							<div>
								<CardTitle
									className="font-bold tracking-tight text-foreground"
									style={{
										fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
										lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
										fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
									}}
								>
									Account Management
								</CardTitle>
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
									config.bgGradient,
									config.borderColor,
									config.textColor
								)}
							>
								<Award className="w-4 h-4 mr-2" />
								{currentPlan}
							</Badge>
							<div className="flex items-center gap-2 mt-2">
								<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
								<span className="text-xs text-muted-foreground font-medium">
									Active Plan
								</span>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent
					className={cn(
						'relative z-10 space-y-8',
						animationClasses('slide-up')
					)}
				>
					{/* Enhanced Usage Stats */}
					{showStats && (
						<div className="bg-gradient-to-r from-muted/10 via-background to-muted/10 rounded-2xl p-6 border-2 border-muted/20">
							<div className="flex items-center justify-between mb-6">
								<h4
									className="text-foreground flex items-center gap-3"
									style={TYPOGRAPHY_SCALE['heading-md']}
								>
									<div className="p-2 bg-primary/10 rounded-lg">
										<Activity className="h-5 w-5 text-primary" />
									</div>
									Monthly Overview
								</h4>
								<Badge variant="outline" className="text-xs font-medium">
									<Clock className="w-3 h-3 mr-1" />
									Updated 2 hours ago
								</Badge>
							</div>
							<div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
								<div className="text-center p-4 bg-background/50 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
										<FileText className="h-5 w-5 text-accent" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.properties}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Properties
									</p>
								</div>
								<div className="text-center p-4 bg-background/50 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
										<Users className="h-5 w-5 text-primary" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.tenants}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Tenants
									</p>
								</div>
								<div className="text-center p-4 bg-background/50 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
										<Zap className="h-5 w-5 text-primary" />
									</div>
									<p className="text-2xl font-black text-primary tabular-nums">
										{usageStats.uptime}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Uptime
									</p>
								</div>
								{usageStats.monthlyRevenue && (
									<div className="text-center p-4 bg-background/50 rounded-xl border border-muted/30">
										<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
											<TrendingUp className="h-5 w-5 text-primary" />
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
									<div className="text-center p-4 bg-background/50 rounded-xl border border-muted/30">
										<div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
											<FileText className="h-5 w-5 text-accent" />
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
						<div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl p-6 border border-accent/20">
							<div className="flex items-center justify-between mb-6">
								<h4
									className="text-foreground flex items-center gap-3"
									style={TYPOGRAPHY_SCALE['heading-md']}
								>
									<div className="p-2 bg-accent/10 rounded-lg">
										<CreditCard className="h-5 w-5 text-accent" />
									</div>
									Billing Information
								</h4>
								<Badge className="bg-primary/10 text-primary border-primary/20">
									<Lock className="w-3 h-3 mr-1" />
									Secured
								</Badge>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{billingInfo.nextBillingDate && (
									<div className="bg-background/70 rounded-lg p-4 border border-primary/20">
										<div className="flex items-center gap-2 mb-2">
											<Calendar className="h-4 w-4 text-primary" />
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
									<div className="bg-background/70 rounded-lg p-4 border border-primary/20">
										<div className="flex items-center gap-2 mb-2">
											<CheckCircle2 className="h-4 w-4 text-accent" />
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
									<div className="bg-background/70 rounded-lg p-4 border border-primary/20">
										<div className="flex items-center gap-2 mb-2">
											<CreditCard className="h-4 w-4 text-primary" />
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
					<div className="text-center space-y-4">
						<p
							className="text-muted-foreground leading-relaxed max-w-3xl mx-auto"
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight
							}}
						>
							Manage your subscription, update payment methods, view invoices,
							download reports, and access all billing features in our secure,
							enterprise-grade customer portal.
						</p>

						{showTestimonial && testimonial && (
							<div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border-2 border-primary/20 max-w-2xl mx-auto">
								<div className="flex items-center justify-center gap-1 mb-4">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star key={i} className="h-4 w-4 fill-accent text-accent" />
									))}
									<span className="ml-2 text-sm font-bold text-primary">
										{testimonial.rating}/5
									</span>
								</div>
								<blockquote className="text-foreground text-center leading-relaxed font-medium">
									"{testimonial.text}"
								</blockquote>
								<div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-primary/10">
									<div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
										<Users className="h-5 w-5 text-primary" />
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
							'grid grid-cols-1 lg:grid-cols-2 gap-4',
							animationClasses('fade-in')
						)}
					>
						<div className="group p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-primary/10 rounded-xl">
									<CreditCard className="w-6 h-6 text-primary" />
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
								<ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-5 bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl border-2 border-accent/20 hover:border-accent/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-accent/10 rounded-xl">
									<FileText className="w-6 h-6 text-accent" />
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
								<ArrowRight className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-primary/10 rounded-xl">
									<Download className="w-6 h-6 text-primary" />
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
								<ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div className="group p-5 bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl border-2 border-accent/20 hover:border-accent/30 hover:shadow-lg cursor-pointer">
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-accent/10 rounded-xl">
									<Sparkles className="w-6 h-6 text-accent" />
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
								<ArrowRight className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform" />
							</div>
						</div>
					</div>

					{/* Enhanced Primary Action */}
					<div className={cn('pt-4', animationClasses('slide-up'))}>
						<CustomerPortalButton
							className={cn(
								'w-full h-16 text-lg font-bold shadow-xl hover:shadow-2xl',
								'bg-gradient-to-r from-primary via-primary to-primary/90',
								'hover:from-primary/90 hover:via-primary/95 hover:to-primary/80',
								'transform hover:scale-[1.02] active:scale-[0.98]',
								'border-2 border-primary/20'
							)}
							size="lg"
							variant="default"
							style={{
								transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
							}}
						>
							<Settings className="w-6 h-6 mr-3" />
							Access Customer Portal
							<ArrowRight className="w-5 h-5 ml-3" />
						</CustomerPortalButton>
					</div>
				</CardContent>
			</Card>

			{/* Enhanced Trust Signals */}
			<div className="bg-gradient-to-r from-muted/10 via-background to-muted/10 rounded-2xl p-6 border-2 border-muted/20">
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-accent/10 rounded-lg">
							<Shield className="w-5 h-5 text-accent" />
						</div>
						<div>
							<p className="font-bold text-foreground">Bank-Level Security</p>
							<p className="text-xs text-muted-foreground">
								256-bit SSL encryption
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<CheckCircle2 className="w-5 h-5 text-primary" />
						</div>
						<div>
							<p className="font-bold text-foreground">Powered by Stripe</p>
							<p className="text-xs text-muted-foreground">
								Trusted by millions
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Users className="w-5 h-5 text-primary" />
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
