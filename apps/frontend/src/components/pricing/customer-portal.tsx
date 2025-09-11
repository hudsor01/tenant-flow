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
				window.location.href = '/auth/login'
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
			style={{
				transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
			}}
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

interface CustomerPortalCardProps {
	className?: string
	showStats?: boolean
	showTestimonial?: boolean
	currentPlan?: string
	planTier?: 'starter' | 'professional' | 'enterprise' | 'ultimate'
	usageStats?: {
		properties: number
		tenants: number
		uptime: string
		monthlyRevenue?: number
		activeLeases?: number
	}
	billingInfo?: {
		nextBillingDate?: string
		lastPayment?: string
		paymentMethod?: string
	}
	testimonial?: {
		text: string
		author: string
		company: string
		rating: number
	}
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
}: CustomerPortalCardProps) {
	// Plan tier configuration
	const tierConfig = {
		starter: {
			gradient: 'from-pink-500 to-pink-600',
			bgGradient:
				'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/10',
			borderColor: 'border-pink-200 dark:border-pink-800',
			textColor: 'text-pink-700 dark:text-pink-300'
		},
		growth: {
			gradient: 'from-blue-500 to-blue-600',
			bgGradient:
				'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10',
			borderColor: 'border-blue-200 dark:border-blue-800',
			textColor: 'text-blue-700 dark:text-blue-300'
		},
		professional: {
			gradient: 'from-indigo-500 to-indigo-600',
			bgGradient:
				'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/10',
			borderColor: 'border-indigo-200 dark:border-indigo-800',
			textColor: 'text-indigo-700 dark:text-indigo-300'
		},
		tenantflow_max: {
			gradient: 'from-purple-500 to-purple-600',
			bgGradient:
				'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10',
			borderColor: 'border-purple-200 dark:border-purple-800',
			textColor: 'text-purple-700 dark:text-purple-300'
		},
		enterprise: {
			gradient: 'from-amber-500 to-amber-600',
			bgGradient:
				'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10',
			borderColor: 'border-amber-200 dark:border-amber-800',
			textColor: 'text-amber-700 dark:text-amber-300'
		}
	}

	const config = tierConfig[planTier as keyof typeof tierConfig] || tierConfig.starter

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
								<Settings className="w-8 h-8 text-white" />
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
									style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}
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
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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
									className="font-bold text-foreground flex items-center gap-3"
									style={{ fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize }}
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
								<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
										<FileText className="h-5 w-5 text-blue-600" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.properties}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Properties
									</p>
								</div>
								<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
										<Users className="h-5 w-5 text-purple-600" />
									</div>
									<p className="text-2xl font-black text-foreground tabular-nums">
										{usageStats.tenants}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Tenants
									</p>
								</div>
								<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-xl border border-muted/30">
									<div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
										<Zap className="h-5 w-5 text-green-600" />
									</div>
									<p className="text-2xl font-black text-green-600 tabular-nums">
										{usageStats.uptime}
									</p>
									<p className="text-xs text-muted-foreground font-medium">
										Uptime
									</p>
								</div>
								{usageStats.monthlyRevenue && (
									<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-xl border border-muted/30">
										<div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
											<TrendingUp className="h-5 w-5 text-emerald-600" />
										</div>
										<p className="text-2xl font-black text-emerald-600 tabular-nums">
											${usageStats.monthlyRevenue.toLocaleString()}
										</p>
										<p className="text-xs text-muted-foreground font-medium">
											Revenue
										</p>
									</div>
								)}
								{usageStats.activeLeases && (
									<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-xl border border-muted/30">
										<div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
											<FileText className="h-5 w-5 text-orange-600" />
										</div>
										<p className="text-2xl font-black text-orange-600 tabular-nums">
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
						<div className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/5 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/30">
							<div className="flex items-center justify-between mb-6">
								<h4
									className="font-bold text-foreground flex items-center gap-3"
									style={{ fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize }}
								>
									<div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
										<CreditCard className="h-5 w-5 text-blue-600" />
									</div>
									Billing Information
								</h4>
								<Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
									<Lock className="w-3 h-3 mr-1" />
									Secured
								</Badge>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{billingInfo.nextBillingDate && (
									<div className="bg-white/70 dark:bg-gray-900/30 rounded-lg p-4 border border-blue-200/30 dark:border-blue-800/20">
										<div className="flex items-center gap-2 mb-2">
											<Calendar className="h-4 w-4 text-blue-600" />
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
									<div className="bg-white/70 dark:bg-gray-900/30 rounded-lg p-4 border border-blue-200/30 dark:border-blue-800/20">
										<div className="flex items-center gap-2 mb-2">
											<CheckCircle2 className="h-4 w-4 text-green-600" />
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
									<div className="bg-white/70 dark:bg-gray-900/30 rounded-lg p-4 border border-blue-200/30 dark:border-blue-800/20">
										<div className="flex items-center gap-2 mb-2">
											<CreditCard className="h-4 w-4 text-blue-600" />
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
										<Star
											key={i}
											className="h-4 w-4 fill-yellow-400 text-yellow-400"
										/>
									))}
									<span className="ml-2 text-sm font-bold text-primary">
										{testimonial.rating}/5
									</span>
								</div>
								<blockquote
									className="text-foreground text-center leading-relaxed font-medium"
									style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}
								>
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
						<div
							className="group p-5 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/5 rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg cursor-pointer"
							style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
						>
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
									<CreditCard className="w-6 h-6 text-blue-600" />
								</div>
								<div>
									<h5
										className="font-bold text-foreground"
										style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}
									>
										Payment Management
									</h5>
									<p className="text-sm text-muted-foreground">
										Update cards & billing info
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
									Secure & instant updates
								</span>
								<ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div
							className="group p-5 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-900/10 dark:to-green-800/5 rounded-2xl border-2 border-green-200/50 dark:border-green-800/30 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg cursor-pointer"
							style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
						>
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
									<FileText className="w-6 h-6 text-green-600" />
								</div>
								<div>
									<h5
										className="font-bold text-foreground"
										style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}
									>
										Invoices & Receipts
									</h5>
									<p className="text-sm text-muted-foreground">
										Download & track payments
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-green-600 dark:text-green-400 font-medium">
									Instant PDF downloads
								</span>
								<ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div
							className="group p-5 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-900/10 dark:to-purple-800/5 rounded-2xl border-2 border-purple-200/50 dark:border-purple-800/30 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg cursor-pointer"
							style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
						>
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
									<Download className="w-6 h-6 text-purple-600" />
								</div>
								<div>
									<h5
										className="font-bold text-foreground"
										style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}
									>
										Usage Reports
									</h5>
									<p className="text-sm text-muted-foreground">
										Analytics & insights
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
									Detailed breakdowns
								</span>
								<ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
							</div>
						</div>

						<div
							className="group p-5 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-800/5 rounded-2xl border-2 border-orange-200/50 dark:border-orange-800/30 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-lg cursor-pointer"
							style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
						>
							<div className="flex items-center gap-4 mb-3">
								<div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
									<Sparkles className="w-6 h-6 text-orange-600" />
								</div>
								<div>
									<h5
										className="font-bold text-foreground"
										style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}
									>
										Plan Management
									</h5>
									<p className="text-sm text-muted-foreground">
										Upgrade, downgrade or cancel
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
									Flexible changes
								</span>
								<ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
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
						<div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
							<Shield className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<p className="font-bold text-foreground">Bank-Level Security</p>
							<p className="text-xs text-muted-foreground">
								256-bit SSL encryption
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
							<CheckCircle2 className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<p className="font-bold text-foreground">Powered by Stripe</p>
							<p className="text-xs text-muted-foreground">
								Trusted by millions
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
							<Users className="w-5 h-5 text-purple-600" />
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
