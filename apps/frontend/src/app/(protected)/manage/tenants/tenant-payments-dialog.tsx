'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import { Badge } from '#components/ui/badge'
import { toast } from 'sonner'
import {
	tenantPaymentKeys,
	useOwnerTenantPayments,
	useSendTenantPaymentReminder
} from '#hooks/api/use-tenant-payments'
import { formatCents } from '@repo/shared/lib/format'
import type { TenantPaymentRecord } from '@repo/shared/types/api-contracts'

interface TenantPaymentsDialogProps {
	tenant_id: string
	tenantName: string
}

export function TenantPaymentsDialog({ tenant_id, tenantName }: TenantPaymentsDialogProps) {
	const limit = 10
	const [isOpen, setIsOpen] = useState(false)
	const paymentsQuery = useOwnerTenantPayments(tenant_id, { limit, enabled: isOpen })
	const reminderMutation = useSendTenantPaymentReminder()
	const hasOutstandingPayments =
		paymentsQuery.data?.payments.some(payment => payment.status !== 'succeeded') ?? false

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					View payments
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Payments for {tenantName}</DialogTitle>
					<DialogDescription>Stripe payment history for this tenant.</DialogDescription>
				</DialogHeader>
				{paymentsQuery.isLoading ? (
					<Skeleton className="h-24" />
				) : (
					<div className="space-y-3">
					{paymentsQuery.data?.payments.length ? (
						paymentsQuery.data.payments.map((payment: TenantPaymentRecord) => (
								<div key={payment.id} className="border rounded-md p-3 space-y-1">
									<div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
										<span>{payment.created_at ?? 'Date unknown'}</span>
										<Badge variant={payment.status === 'succeeded' ? 'secondary' : 'outline'}>
											{payment.status}
										</Badge>
									</div>
									<div className="text-lg font-semibold">
										{formatCents(payment.amount)}
									</div>
									{payment.description && (
										<div className="text-sm text-muted-foreground">
											{payment.description}
										</div>
									)}
								</div>
							))
						) : (
							<div className="text-sm text-muted-foreground">No payments found</div>
						)}
					</div>
				)}
				<div className="mt-6 flex flex-col gap-3 rounded-lg border border-border/50 px-4 py-3">
					<div>
						<p className="text-sm font-semibold">Need a quick reminder?</p>
						<p className="text-xs text-muted-foreground">
							Notify your tenant about pending rent directly from here.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							reminderMutation.mutate(
								{
									request: { tenant_id },
									ownerQueryKey: [...tenantPaymentKeys.owner(tenant_id), limit]
								},
								{
									onSuccess: data => toast.success(data.message ?? 'Reminder sent'),
									onError: error =>
										toast.error(
											error instanceof Error ? error.message : 'Failed to send reminder'
										)
								}
							)
						}
						disabled={!hasOutstandingPayments || reminderMutation.isPending}
					>
						{reminderMutation.isPending ? 'Sending reminder...' : 'Send reminder'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
