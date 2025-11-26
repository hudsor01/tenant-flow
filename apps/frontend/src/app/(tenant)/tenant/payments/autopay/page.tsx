'use client'

import { useState } from 'react'
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import { Switch } from '#components/ui/switch'

import { useTenantAutopayStatus, useTenantLease } from '#hooks/api/use-tenant-portal'
import {
	useTenantPortalSetupAutopay,
	useTenantPortalCancelAutopay
} from '#hooks/api/use-tenant-autopay'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { formatCents } from '@repo/shared/lib/format'

export default function TenantAutopayPage() {
	const { data: autopayStatus, isLoading: isLoadingAutopay } = useTenantAutopayStatus()
	const { data: lease, isLoading: isLoadingLease } = useTenantLease()
	const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = usePaymentMethods()
	
	const setupAutopay = useTenantPortalSetupAutopay()
	const cancelAutopay = useTenantPortalCancelAutopay()
	
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
	
	const isLoading = isLoadingAutopay || isLoadingLease || isLoadingPaymentMethods
	const isAutopayEnabled = autopayStatus?.autopayEnabled ?? false
	const hasPaymentMethods = (paymentMethods?.length ?? 0) > 0
	
	const handleToggleAutopay = async () => {
		if (!lease) {
			toast.error('No active lease found')
			return
		}
		
		// Get tenant_id from autopayStatus or we need to fetch it
		const tenant_id = autopayStatus?.tenant_id
		if (!tenant_id) {
			toast.error('Unable to identify tenant')
			return
		}
		
		if (isAutopayEnabled) {
			// Cancel autopay
			try {
				await cancelAutopay.mutateAsync({
					tenant_id,
					lease_id: lease.id
				})
				toast.success('Autopay has been disabled')
			} catch {
				toast.error('Failed to disable autopay')
			}
		} else {
			// Enable autopay
			if (!selectedPaymentMethodId && hasPaymentMethods) {
				toast.error('Please select a payment method')
				return
			}
			
			try {
				const params: { tenant_id: string; lease_id: string; paymentMethodId?: string } = {
					tenant_id,
					lease_id: lease.id
				}
				if (selectedPaymentMethodId) {
					params.paymentMethodId = selectedPaymentMethodId
				}
				await setupAutopay.mutateAsync(params)
				toast.success('Autopay has been enabled')
			} catch {
				toast.error('Failed to enable autopay')
			}
		}
	}
	
	if (isLoading) {
		return (
			<div className="space-y-6 p-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}
	
	if (!lease) {
		return (
			<div className="p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertTitle>No Active Lease</AlertTitle>
					<AlertDescription>
						You need an active lease to set up autopay for rent payments.
					</AlertDescription>
				</Alert>
			</div>
		)
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Autopay Settings</h1>
				<p className="text-muted-foreground">
					Manage automatic rent payments for your lease.
				</p>
			</div>

			{/* Status Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								Autopay Status
								{isAutopayEnabled ? (
									<Badge variant="default" className="ml-2">
										<CheckCircle2 className="mr-1 size-3" />
										Active
									</Badge>
								) : (
									<Badge variant="outline" className="ml-2">
										Inactive
									</Badge>
								)}
							</CardTitle>
							<CardDescription>
								{isAutopayEnabled
									? 'Your rent will be automatically charged on the due date.'
									: 'Enable autopay to never miss a rent payment.'}
							</CardDescription>
						</div>
						<Switch
							checked={isAutopayEnabled}
							onCheckedChange={handleToggleAutopay}
							disabled={setupAutopay.isPending || cancelAutopay.isPending}
						/>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Lease Info */}
					<div className="rounded-lg border p-4 space-y-3">
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Monthly Rent</span>
							<span className="font-semibold">
								{formatCents(lease.rent_amount)}
							</span>
						</div>
						{autopayStatus?.nextPaymentDate && (
							<div className="flex justify-between">
								<span className="text-sm text-muted-foreground">Next Payment</span>
								<span className="font-semibold">
									{new Date(autopayStatus.nextPaymentDate).toLocaleDateString('en-US', {
										month: 'long',
										day: 'numeric',
										year: 'numeric'
									})}
								</span>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Property</span>
							<span className="font-semibold">
								{lease.unit?.property?.name ?? 'N/A'}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Unit</span>
							<span className="font-semibold">
								{lease.unit?.unit_number ?? 'N/A'}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Payment Method Selection */}
			{!isAutopayEnabled && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="size-5" />
							Payment Method
						</CardTitle>
						<CardDescription>
							Select which payment method to use for autopay.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!hasPaymentMethods ? (
							<Alert>
								<AlertCircle className="size-4" />
								<AlertTitle>No Payment Methods</AlertTitle>
								<AlertDescription>
									You need to add a payment method before enabling autopay.{' '}
									<a
										href="/tenant/payments/methods"
										className="font-medium underline underline-offset-4"
									>
										Add a payment method
									</a>
								</AlertDescription>
							</Alert>
						) : (
							<div className="space-y-2">
								<Label htmlFor="payment-method">Select Payment Method</Label>
								<Select
									value={selectedPaymentMethodId}
									onValueChange={setSelectedPaymentMethodId}
								>
									<SelectTrigger id="payment-method">
										<SelectValue placeholder="Choose a payment method" />
									</SelectTrigger>
									<SelectContent>
										{paymentMethods?.map(method => (
											<SelectItem key={method.id} value={method.id}>
												<div className="flex items-center gap-2">
													<CreditCard className="size-4" />
													<span>
														{method.type === 'card' ? method.brand : 'Bank Account'} ****
														{method.last4}
													</span>
													{method.isDefault && (
														<Badge variant="secondary" className="ml-2">
															Default
														</Badge>
													)}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</CardContent>
					<CardFooter>
						<Button
							onClick={handleToggleAutopay}
							disabled={!hasPaymentMethods || setupAutopay.isPending}
							className="w-full"
						>
							{setupAutopay.isPending ? 'Enabling...' : 'Enable Autopay'}
						</Button>
					</CardFooter>
				</Card>
			)}

			{/* Info Section */}
			<Card>
				<CardHeader>
					<CardTitle>How Autopay Works</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							1
						</div>
						<div>
							<p className="font-medium">Automatic Charging</p>
							<p className="text-sm text-muted-foreground">
								Your payment method will be charged automatically on the rent due date each month.
							</p>
						</div>
					</div>
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							2
						</div>
						<div>
							<p className="font-medium">Email Notifications</p>
							<p className="text-sm text-muted-foreground">
								You will receive email confirmations when payments are processed successfully.
							</p>
						</div>
					</div>
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							3
						</div>
						<div>
							<p className="font-medium">Cancel Anytime</p>
							<p className="text-sm text-muted-foreground">
								You can disable autopay at any time from this page. Changes take effect immediately.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
