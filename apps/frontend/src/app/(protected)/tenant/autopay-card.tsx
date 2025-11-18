'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Spinner } from '#components/ui/spinner'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { useTenantAutopayStatus } from '#hooks/api/use-tenant-portal'
import {
	useTenantPortalCancelAutopay,
	useTenantPortalSetupAutopay
} from '#hooks/api/use-tenant-autopay'
import { toast } from 'sonner'

export function TenantAutopayCard() {
	const autopay = useTenantAutopayStatus()
	const setup = useTenantPortalSetupAutopay()
	const cancel = useTenantPortalCancelAutopay()
	const { data: paymentMethods = [], isFetched: methodsFetched } = usePaymentMethods()

	const lease_id = autopay.data?.lease_id ?? null
	const tenant_id = autopay.data?.tenant_id ?? null
	const enabled = autopay.data?.autopayEnabled ?? false
	const nextPaymentDate = autopay.data?.nextPaymentDate ?? 'Coming soon'

	const defaultMethod = paymentMethods.find(method => method.isDefault) ?? paymentMethods[0]
	const canEnable = Boolean(defaultMethod)

	if (!tenant_id || !lease_id) {
		return null
	}

	const handleToggle = () => {
		if (enabled) {
			cancel.mutate({ tenant_id, lease_id }, {
				onSuccess: () => toast.success('Autopay cancelled'),
				onError: () => toast.error('Could not cancel autopay')
			})
			return
		}

		if (!canEnable) {
			toast.error('Save a payment method before enabling autopay')
			return
		}

		setup.mutate({ tenant_id, lease_id, paymentMethodId: defaultMethod!.stripePaymentMethodId }, {
			onSuccess: () => toast.success('Autopay enabled'),
			onError: () => toast.error('Failed to start autopay')
		})
	}

	const description = enabled
		? `Next payment scheduled for ${nextPaymentDate}`
		: canEnable
			? 'Enable autopay to automate rent payments'
			: methodsFetched
				? 'Add a payment method to enable autopay'
				: 'Loading payment methods...'

	return (
		<CardLayout title="Autopay" description={description}>
			<div className="flex items-center gap-3">
				<Button
					onClick={handleToggle}
					disabled={setup.isPending || cancel.isPending || (!canEnable && !enabled)}
				>
					{setup.isPending || cancel.isPending ? (
						<>
							<Spinner className="size-4 mr-2" />
							{enabled ? 'Canceling...' : 'Enabling...'}
						</>
					) : enabled ? (
						'Disable autopay'
					) : (
						'Enable autopay'
					)}
				</Button>
			</div>
		</CardLayout>
	)
}
