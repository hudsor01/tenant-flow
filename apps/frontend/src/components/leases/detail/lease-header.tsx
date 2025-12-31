'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { SendForSignatureButton } from '#components/leases/send-for-signature-button'
import { SignLeaseButton } from '#components/leases/sign-lease-button'
import { DownloadSignedLeaseButton } from '#components/leases/download-signed-lease-button'
import { LEASE_STATUS } from '#lib/constants/status-values'
import { toast } from 'sonner'
import { cn } from '#lib/utils'
import type { Lease } from '@repo/shared/types/core'
import { getStatusConfig, getDaysUntilExpiry } from './lease-detail-utils'

interface TenantInfo {
	first_name?: string | null | undefined
	last_name?: string | null | undefined
	name?: string | null | undefined
}

interface LeaseHeaderProps {
	lease: Lease
	tenant: TenantInfo | null | undefined
	onCancelSignature: () => Promise<void>
	isCancelling: boolean
}

export function LeaseHeader({
	lease,
	tenant,
	onCancelSignature,
	isCancelling
}: LeaseHeaderProps) {
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature =
		lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const isActive = lease.lease_status === LEASE_STATUS.ACTIVE

	const daysUntilExpiry = getDaysUntilExpiry(lease.end_date)
	const isExpiringSoon =
		daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30

	const statusConfig = getStatusConfig(lease.lease_status)

	const tenantFullName =
		tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
			: tenant?.name

	// Build props conditionally to satisfy exactOptionalPropertyTypes
	const signatureButtonProps: {
		leaseId: string
		size: 'sm'
		tenantName?: string
	} = {
		leaseId: lease.id,
		size: 'sm'
	}
	if (tenantFullName) {
		signatureButtonProps.tenantName = tenantFullName
	}

	const handleCancelSignature = async () => {
		try {
			await onCancelSignature()
			toast.success('Signature request cancelled', {
				description: 'The lease has been reverted to draft status.'
			})
			setCancelDialogOpen(false)
		} catch (error) {
			toast.error('Failed to cancel signature request', {
				description:
					error instanceof Error ? error.message : 'Please try again.'
			})
		}
	}

	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div className="flex items-center gap-3">
				<h2 className="text-lg font-semibold">Lease #{lease.id.slice(0, 8)}</h2>
				<span
					className={cn(
						'inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium',
						statusConfig.className
					)}
				>
					{statusConfig.label}
				</span>
				{isExpiringSoon && (
					<Badge
						variant="outline"
						className="border-orange-500 text-orange-600 dark:text-orange-400"
					>
						<AlertTriangle className="w-3 h-3 mr-1" />
						Expires in {daysUntilExpiry} days
					</Badge>
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				{isDraft && tenant && (
					<SendForSignatureButton {...signatureButtonProps} />
				)}
				{isPendingSignature && (
					<>
						<SignLeaseButton
							leaseId={lease.id}
							role="owner"
							alreadySigned={!!lease.owner_signed_at}
							size="sm"
						/>
						<SendForSignatureButton
							{...signatureButtonProps}
							action="resend"
							variant="outline"
						/>
						<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
							<AlertDialogTrigger asChild>
								<Button variant="outline" size="sm">
									Cancel Request
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Cancel Signature Request?</AlertDialogTitle>
									<AlertDialogDescription>
										This will revert the lease to draft status. Any pending
										signatures will be lost and you will need to send a new
										signature request.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel disabled={isCancelling}>
										Keep Request
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={e => {
											e.preventDefault()
											handleCancelSignature()
										}}
										disabled={isCancelling}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isCancelling ? 'Cancelling...' : 'Cancel Request'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</>
				)}
				{isActive && <DownloadSignedLeaseButton leaseId={lease.id} size="sm" />}
				<Button asChild variant="outline" size="sm">
					<Link href={`/leases/${lease.id}/edit`}>Edit Lease</Link>
				</Button>
			</div>
		</div>
	)
}
