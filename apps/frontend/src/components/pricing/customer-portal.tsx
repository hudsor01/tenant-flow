'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-client'
import type { CustomerPortalButtonProps } from '@/types/stripe'
import { CreditCard, Download, FileText, Settings } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function CustomerPortalButton({
	variant = 'outline',
	size = 'default',
	className,
	children
}: CustomerPortalButtonProps) {
	const [isLoading, setIsLoading] = useState(false)

	const handlePortalAccess = async () => {
		setIsLoading(true)

		try {
			// Check if user is authenticated
			const authToken = localStorage.getItem('auth-token')
			if (!authToken) {
				toast.error('Please sign in to access your account')
				window.location.href = '/auth/login'
				return
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
		} catch (error) {
			console.error('Portal access error:', error)
			toast.error(
				`Failed to access portal: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ id: 'portal' }
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Button
			variant={variant}
			size={size}
			className={className}
			onClick={handlePortalAccess}
			disabled={isLoading}
		>
			{children || (
				<>
					<Settings className="w-4 h-4 mr-2" />
					{isLoading ? 'Loading...' : 'Manage Subscription'}
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
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="w-5 h-5" />
					Subscription Management
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-muted-foreground">
					Manage your subscription, update payment methods, view invoices, and
					more.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="flex items-center gap-2 text-sm">
						<CreditCard className="w-4 h-4 text-muted-foreground" />
						<span>Update payment method</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<FileText className="w-4 h-4 text-muted-foreground" />
						<span>View invoices</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Download className="w-4 h-4 text-muted-foreground" />
						<span>Download receipts</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Settings className="w-4 h-4 text-muted-foreground" />
						<span>Change plans</span>
					</div>
				</div>

				<div className="pt-4">
					<CustomerPortalButton className="w-full" size="lg" />
				</div>

				<div className="text-xs text-muted-foreground">
					<Badge variant="secondary" className="mr-2">
						Secure
					</Badge>
					Powered by Stripe
				</div>
			</CardContent>
		</Card>
	)
}
