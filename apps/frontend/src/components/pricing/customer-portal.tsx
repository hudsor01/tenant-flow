'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-client'
import { 
	CreditCard, 
	Download, 
	FileText, 
	Settings, 
	Shield, 
	CheckCircle2,
	TrendingUp,
	Users,
	Clock,
	ArrowRight,
	Star
} from 'lucide-react'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { 
	cn, 
	buttonClasses,
	cardClasses,
	animationClasses,
	badgeClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'

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
		onError: (error) => {
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
				buttonClasses(variant as any, size as any),
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
	usageStats?: {
		properties: number
		tenants: number
		uptime: string
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
	usageStats = {
		properties: 12,
		tenants: 48,
		uptime: '99.9%'
	},
	testimonial = {
		text: 'TenantFlow transformed our property management workflow. The billing portal saves us hours every month.',
		author: 'Sarah Johnson',
		company: 'Metro Properties',
		rating: 5
	}
}: CustomerPortalCardProps) {
	return (
		<Card 
			className={cn(
				cardClasses('elevated'),
				'shadow-xl hover:shadow-2xl border-2 border-primary/10',
				animationClasses('fade-in'),
				className
			)}
			style={{
				transition: `all ${ANIMATION_DURATIONS.default} ease-out`
			}}
		>
			<CardHeader className={animationClasses('slide-down')}>
				<div className="text-center space-y-4">
					<div className="flex items-center justify-center gap-3">
						<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-xl">
							<CreditCard className="w-6 h-6 text-primary" />
						</div>
						<CardTitle 
							className="font-bold tracking-tight"
							style={{
								fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight
							}}
						>
							Account Management
						</CardTitle>
					</div>
					
					{/* Current Plan Badge */}
					<div className="inline-flex items-center gap-2">
						<Badge 
							variant="secondary" 
							className="bg-primary/10 text-primary border-primary/20 font-semibold px-3 py-1"
						>
							<Star className="w-3 h-3 mr-1" />
							{currentPlan}
						</Badge>
						<Badge variant="outline" className="text-xs">
							Active
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className={cn("space-y-8", animationClasses('slide-up'))}>
				{/* Usage Stats */}
				{showStats && (
					<div className="bg-muted/20 rounded-xl p-4 border border-muted/40">
						<h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-primary" />
							Your Usage This Month
						</h4>
						<div className="grid grid-cols-3 gap-4">
							<div className="text-center">
								<p className="text-xl font-bold text-primary">{usageStats.properties}</p>
								<p className="text-xs text-muted-foreground">Properties</p>
							</div>
							<div className="text-center">
								<p className="text-xl font-bold text-primary">{usageStats.tenants}</p>
								<p className="text-xs text-muted-foreground">Tenants</p>
							</div>
							<div className="text-center">
								<p className="text-xl font-bold text-green-600">{usageStats.uptime}</p>
								<p className="text-xs text-muted-foreground">Uptime</p>
							</div>
						</div>
					</div>
				)}
				
				<div className="text-center space-y-3">
					<p 
						className="text-muted-foreground leading-relaxed"
						style={{
							fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight
						}}
					>
						Manage your subscription, update payment methods, view invoices, and access all billing features in one secure portal.
					</p>
					
					{showTestimonial && testimonial && (
						<div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
							<div className="flex items-center justify-center gap-1 mb-2">
								{[...Array(testimonial.rating)].map((_, i) => (
									<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
								))}
							</div>
							<blockquote className="text-sm italic text-muted-foreground text-center leading-relaxed">
								"{testimonial.text}"
							</blockquote>
							<cite className="text-xs font-semibold text-foreground mt-2 block">
								{testimonial.author}, {testimonial.company}
							</cite>
						</div>
					)}
				</div>

				{/* Feature Grid */}
				<div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", animationClasses('fade-in'))}>
					<div className="group flex items-center justify-between p-4 bg-muted/20 rounded-xl hover:bg-muted/30 transition-all cursor-pointer border border-muted/40 hover:border-primary/30">
						<div className="flex items-center gap-3">
							<div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
								<CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
							</div>
							<span className="font-semibold text-sm">Update payment method</span>
						</div>
						<ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>
					
					<div className="group flex items-center justify-between p-4 bg-muted/20 rounded-xl hover:bg-muted/30 transition-all cursor-pointer border border-muted/40 hover:border-primary/30">
						<div className="flex items-center gap-3">
							<div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
								<FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
							</div>
							<span className="font-semibold text-sm">View invoices & receipts</span>
						</div>
						<ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>
					
					<div className="group flex items-center justify-between p-4 bg-muted/20 rounded-xl hover:bg-muted/30 transition-all cursor-pointer border border-muted/40 hover:border-primary/30">
						<div className="flex items-center gap-3">
							<div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
								<Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
							</div>
							<span className="font-semibold text-sm">Download reports</span>
						</div>
						<ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>
					
					<div className="group flex items-center justify-between p-4 bg-muted/20 rounded-xl hover:bg-muted/30 transition-all cursor-pointer border border-muted/40 hover:border-primary/30">
						<div className="flex items-center gap-3">
							<div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
								<Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
							</div>
							<span className="font-semibold text-sm">Upgrade or change plan</span>
						</div>
						<ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>
				</div>

				{/* Primary Action */}
				<div className={cn("pt-2", animationClasses('slide-up'))}>
					<CustomerPortalButton 
						className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
						size="lg" 
						variant="default"
					>
						<Settings className="w-5 h-5 mr-2" />
						Access Customer Portal
						<ArrowRight className="w-4 h-4 ml-2" />
					</CustomerPortalButton>
				</div>

				{/* Trust Signals */}
				<div className="bg-muted/10 rounded-lg p-4 border border-muted/20">
					<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<div className="bg-green-100 dark:bg-green-900/20 p-1.5 rounded-md">
								<Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
							</div>
							<span className="font-semibold">Bank-level Security</span>
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-3 h-3 text-blue-600" />
							<span className="font-semibold">Powered by Stripe</span>
						</div>
						<div className="flex items-center gap-2">
							<Users className="w-3 h-3 text-purple-600" />
							<span className="font-semibold">10,000+ Users</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
