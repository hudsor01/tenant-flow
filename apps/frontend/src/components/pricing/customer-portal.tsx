'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-client'
import { CreditCard, Download, FileText, Settings, Shield, CheckCircle2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { 
	cn, 
	buttonClasses,
	cardClasses,
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
}

export function CustomerPortalCard({ className }: CustomerPortalCardProps) {
	return (
		<Card 
			className={cn(
				cardClasses(),
				'shadow-lg hover:shadow-xl border-2',
				className
			)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				transition: `all ${ANIMATION_DURATIONS.default} ease-out`
			}}
		>
			<CardHeader
				style={{
					animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<CardTitle 
					className="flex items-center gap-3 font-bold tracking-tight"
					style={{
						fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
						lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
					}}
				>
					<div className="bg-primary/10 p-2 rounded-lg">
						<CreditCard className="w-5 h-5 text-primary" />
					</div>
					Subscription Management
				</CardTitle>
			</CardHeader>
			<CardContent 
				className="space-y-6"
				style={{
					animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<p className="text-muted-foreground leading-relaxed text-base">
					Manage your subscription, update payment methods, view invoices, and access all billing features in one secure portal.
				</p>

				<div 
					className="grid grid-cols-1 sm:grid-cols-2 gap-4"
					style={{
						animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
					}}
				>
					<div className="flex items-center gap-3 text-sm p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
						<div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-md">
							<CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
						</div>
						<span className="font-medium">Update payment method</span>
					</div>
					<div className="flex items-center gap-3 text-sm p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
						<div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-md">
							<FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
						</div>
						<span className="font-medium">View invoices</span>
					</div>
					<div className="flex items-center gap-3 text-sm p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
						<div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-md">
							<Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
						</div>
						<span className="font-medium">Download receipts</span>
					</div>
					<div className="flex items-center gap-3 text-sm p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
						<div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-md">
							<Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
						</div>
						<span className="font-medium">Change plans</span>
					</div>
				</div>

				<div 
					className="pt-2"
					style={{
						animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`
					}}
				>
					<CustomerPortalButton 
						className="w-full h-12" 
						size="lg" 
						variant="default"
					/>
				</div>

				<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
					<div className="flex items-center gap-2">
						<div className="bg-green-100 dark:bg-green-900/20 p-1 rounded">
							<Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
						</div>
						<Badge variant="secondary" className="text-xs font-medium">
							Bank-level Security
						</Badge>
					</div>
					<div className="flex items-center gap-1">
						<CheckCircle2 className="w-3 h-3 text-blue-600" />
						<span className="font-medium">Powered by Stripe</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
