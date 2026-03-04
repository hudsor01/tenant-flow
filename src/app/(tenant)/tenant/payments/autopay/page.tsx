'use client'

import { useState } from 'react'
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
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

import {
	useTenantAutopayStatus,
	useTenantLease,
	useTenantPortalSetupAutopayMutation,
	useTenantPortalCancelAutopayMutation
} from '#hooks/api/use-tenant-portal'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { formatCents } from '#shared/lib/format'

export default function TenantAutopayPage() {
	const { data: autopayStatus, isLoading: isLoadingAutopay } =
		useTenantAutopayStatus()
	const { data: lease, isLoading: isLoadingLease } = useTenantLease()
	const { data: paymentMethods, isLoading: isLoadingPaymentMethods } =
		usePaymentMethods()
	const setupAutopay = useTenantPortalSetupAutopayMutation()
	const cancelAutopay = useTenantPortalCancelAutopayMutation()
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
		useState<string>('')

	const isLoading =
		isLoadingAutopay || isLoadingLease || isLoadingPaymentMethods
	const isAutopayEnabled = autopayStatus?.autopayEnabled ?? false
	const hasPaymentMethods = (paymentMethods?.length ?? 0) > 0
	const isMutating = setupAutopay.isPending || cancelAutopay.isPending

	const handleEnableAutopay = async () => {
		if (!lease || !autopayStatus?.tenant_id) return
		if (!selectedPaymentMethodId && hasPaymentMethods) {
			toast.error('Please select a payment method')
			return
		}
		const params: { tenant_id: string; lease_id: string; paymentMethodId?: string } = {
			tenant_id: autopayStatus.tenant_id,
			lease_id: lease.id,
		}
		if (selectedPaymentMethodId) {
			params.paymentMethodId = selectedPaymentMethodId
		}
		await setupAutopay.mutateAsync(params)
	}

	const handleDisableAutopay = async () => {
		if (!lease || !autopayStatus?.tenant_id) return
		await cancelAutopay.mutateAsync({
			tenant_id: autopayStatus.tenant_id,
			lease_id: lease.id
		})
	}

	const handleToggle = () => {
		if (isAutopayEnabled) {
			handleDisableAutopay()
		} else {
			handleEnableAutopay()
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
				<h1 className="typography-h3 tracking-tight">Autopay Settings</h1>
				<p className="text-muted-foreground">
					Manage automatic rent payments for your lease.
				</p>
			</div>

			<AutopayStatusCard
				isEnabled={isAutopayEnabled}
				isMutating={isMutating}
				lease={lease}
				autopayStatus={autopayStatus}
				onToggle={handleToggle}
			/>

			{!isAutopayEnabled && (
				<PaymentMethodSelectionCard
					paymentMethods={paymentMethods ?? []}
					hasPaymentMethods={hasPaymentMethods}
					selectedId={selectedPaymentMethodId}
					onSelect={setSelectedPaymentMethodId}
					onEnable={handleEnableAutopay}
					isPending={setupAutopay.isPending}
				/>
			)}

			<HowItWorksCard />
		</div>
	)
}

// ---------------------------------------------------------------------------
// Sub-components (extracted to stay under 50-line function limit)
// ---------------------------------------------------------------------------

interface StatusCardProps {
	isEnabled: boolean
	isMutating: boolean
	lease: { rent_amount: number; unit?: { unit_number?: string; property?: { name?: string } } | null }
	autopayStatus: { nextPaymentDate?: string | null; paymentMethodBrand?: string | null; paymentMethodLast4?: string | null } | undefined
	onToggle: () => void
}

function AutopayStatusCard({ isEnabled, isMutating, lease, autopayStatus, onToggle }: StatusCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							Autopay Status
							<Badge variant={isEnabled ? 'default' : 'outline'} className="ml-2">
								{isEnabled && <CheckCircle2 className="mr-1 size-3" />}
								{isEnabled ? 'Active' : 'Inactive'}
							</Badge>
						</CardTitle>
						<CardDescription>
							{isEnabled
								? 'Your rent will be automatically charged on the due date.'
								: 'Enable autopay to never miss a rent payment.'}
						</CardDescription>
					</div>
					<Switch checked={isEnabled} onCheckedChange={onToggle} disabled={isMutating} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-lg border p-4 space-y-3">
					<InfoRow label="Monthly Rent" value={formatCents(lease.rent_amount)} />
					{isEnabled && autopayStatus?.nextPaymentDate && (
						<InfoRow
							label="Next Payment"
							value={new Date(autopayStatus.nextPaymentDate).toLocaleDateString('en-US', {
								month: 'long', day: 'numeric', year: 'numeric'
							})}
						/>
					)}
					{isEnabled && autopayStatus?.paymentMethodLast4 && (
						<InfoRow
							label="Payment Method"
							value={`${autopayStatus.paymentMethodBrand ?? 'Card'} ending in ${autopayStatus.paymentMethodLast4}`}
						/>
					)}
					<InfoRow label="Property" value={lease.unit?.property?.name ?? 'N/A'} />
					<InfoRow label="Unit" value={lease.unit?.unit_number ?? 'N/A'} />
				</div>
			</CardContent>
		</Card>
	)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between">
			<span className="text-muted">{label}</span>
			<span className="font-semibold">{value}</span>
		</div>
	)
}

interface PaymentMethodCardProps {
	paymentMethods: Array<{ id: string; type: string; brand: string | null; last4: string | null; isDefault: boolean }>
	hasPaymentMethods: boolean
	selectedId: string
	onSelect: (id: string) => void
	onEnable: () => void
	isPending: boolean
}

function PaymentMethodSelectionCard({ paymentMethods, hasPaymentMethods, selectedId, onSelect, onEnable, isPending }: PaymentMethodCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="size-5" />
					Payment Method
				</CardTitle>
				<CardDescription>Select which payment method to use for autopay.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasPaymentMethods ? (
					<Alert>
						<AlertCircle className="size-4" />
						<AlertTitle>No Payment Methods</AlertTitle>
						<AlertDescription>
							You need to add a payment method before enabling autopay.{' '}
							<Link href="/tenant/payments/methods" className="font-medium underline underline-offset-4">
								Add a payment method
							</Link>
						</AlertDescription>
					</Alert>
				) : (
					<div className="space-y-2">
						<Label htmlFor="payment-method">Select Payment Method</Label>
						<Select value={selectedId} onValueChange={onSelect}>
							<SelectTrigger id="payment-method">
								<SelectValue placeholder="Choose a payment method" />
							</SelectTrigger>
							<SelectContent>
								{paymentMethods.map(method => (
									<SelectItem key={method.id} value={method.id}>
										<div className="flex items-center gap-2">
											<CreditCard className="size-4" />
											<span>
												{method.type === 'card' ? method.brand : 'Bank Account'} ****{method.last4}
											</span>
											{method.isDefault && <Badge variant="secondary" className="ml-2">Default</Badge>}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</CardContent>
			<CardFooter>
				<Button onClick={onEnable} disabled={!hasPaymentMethods || isPending} className="w-full">
					{isPending ? 'Enabling...' : 'Enable Autopay'}
				</Button>
			</CardFooter>
		</Card>
	)
}

function HowItWorksCard() {
	const steps = [
		{ title: 'Automatic Charging', desc: 'Your payment method will be charged automatically on the rent due date each month.' },
		{ title: 'Email Notifications', desc: 'You will receive email confirmations when payments are processed successfully.' },
		{ title: 'Cancel Anytime', desc: 'You can disable autopay at any time from this page. Changes take effect immediately.' },
	]

	return (
		<Card>
			<CardHeader><CardTitle>How Autopay Works</CardTitle></CardHeader>
			<CardContent className="space-y-3">
				{steps.map((step, i) => (
					<div key={step.title} className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							{i + 1}
						</div>
						<div>
							<p className="font-medium">{step.title}</p>
							<p className="text-muted">{step.desc}</p>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
