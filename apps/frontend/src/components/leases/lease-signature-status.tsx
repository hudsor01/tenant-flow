'use client'

import { AlertCircle, CheckCircle2, Clock, PenLine, Send } from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { cn } from '#lib/utils'
import { useLeaseSignatureStatus } from '#hooks/api/use-lease'
import type { SignatureStatus } from '#hooks/api/queries/lease-queries'
import {
	LEASE_SIGNATURE_ERROR_MESSAGES,
	LEASE_SIGNATURE_ERROR_CODES
} from '@repo/shared/constants/lease-signature-errors'

interface LeaseSignatureStatusProps {
	leaseId: string
	className?: string
	compact?: boolean
}

/**
 * Displays the current signature status of a lease
 * Shows who has signed and when, with visual indicators
 */
export function LeaseSignatureStatus({
	leaseId,
	className,
	compact = false
}: LeaseSignatureStatusProps) {
	const { data: status, isLoading, error } = useLeaseSignatureStatus(leaseId)

	if (isLoading) {
		return <SignatureStatusSkeleton compact={compact} />
	}

	if (error) {
		return (
			<Card
				className={cn('border-destructive/50', className)}
				data-testid="signature-status-error"
			>
				<CardContent className="py-4">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm">
							{
								LEASE_SIGNATURE_ERROR_MESSAGES[
									LEASE_SIGNATURE_ERROR_CODES.FRONTEND_LOAD_FAILED
								]
							}
						</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!status) {
		return null
	}

	if (compact) {
		return (
			<CompactSignatureStatus status={status} className={className ?? ''} />
		)
	}

	return <FullSignatureStatus status={status} className={className ?? ''} />
}

function SignatureStatusSkeleton({ compact }: { compact: boolean }) {
	if (compact) {
		return (
			<div className="flex items-center gap-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-5 w-24" />
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-32" />
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</CardContent>
		</Card>
	)
}

function CompactSignatureStatus({
	status,
	className
}: {
	status: SignatureStatus
	className?: string
}) {
	return (
		<div className={cn('flex items-center gap-2 flex-wrap', className)}>
			<SignatureBadge
				label="Owner"
				signed={status.owner_signed}
				signedAt={status.owner_signed_at}
			/>
			<SignatureBadge
				label="Tenant"
				signed={status.tenant_signed}
				signedAt={status.tenant_signed_at}
			/>
		</div>
	)
}

function FullSignatureStatus({
	status,
	className
}: {
	status: SignatureStatus
	className?: string
}) {
	const getStatusIcon = () => {
		if (status.both_signed) {
			return <CheckCircle2 className="h-5 w-5 text-success" />
		}
		if (status.sent_for_signature_at) {
			return <Clock className="h-5 w-5 text-warning" />
		}
		return <PenLine className="h-5 w-5 text-muted-foreground" />
	}

	const getStatusText = () => {
		if (status.both_signed) {
			return 'Fully Signed'
		}
		if (status.owner_signed && !status.tenant_signed) {
			return 'Awaiting Tenant Signature'
		}
		if (!status.owner_signed && status.tenant_signed) {
			return 'Awaiting Owner Signature'
		}
		if (status.sent_for_signature_at) {
			return 'Awaiting Signatures'
		}
		return 'Draft - Not Sent'
	}

	return (
		<Card className={cn('', className)} data-testid="signature-status">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					{getStatusIcon()}
					<span>Signature Status</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex-between">
					<span className="text-muted">Overall Status</span>
					<Badge
						variant={status.both_signed ? 'default' : 'secondary'}
						className={cn(status.both_signed && 'bg-success hover:bg-success')}
					>
						{getStatusText()}
					</Badge>
				</div>

				<div className="grid gap-3">
					<SignatureRow
						label="Owner Signature"
						signed={status.owner_signed}
						signedAt={status.owner_signed_at}
					/>
					<SignatureRow
						label="Tenant Signature"
						signed={status.tenant_signed}
						signedAt={status.tenant_signed_at}
					/>
				</div>

				{status.sent_for_signature_at && (
					<div className="flex items-center gap-2 text-caption pt-2 border-t">
						<Send className="h-3 w-3" />
						<span>
							Sent for signature on{' '}
							{new Date(status.sent_for_signature_at).toLocaleDateString()}
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function SignatureBadge({
	label,
	signed,
	signedAt
}: {
	label: string
	signed: boolean
	signedAt: string | null
}) {
	return (
		<Badge
			variant={signed ? 'default' : 'outline'}
			className={cn('gap-1', signed && 'bg-success hover:bg-success')}
			title={
				signedAt
					? `Signed on ${new Date(signedAt).toLocaleString()}`
					: undefined
			}
		>
			{signed ? (
				<CheckCircle2 className="h-3 w-3" />
			) : (
				<Clock className="h-3 w-3" />
			)}
			{label}
		</Badge>
	)
}

function SignatureRow({
	label,
	signed,
	signedAt
}: {
	label: string
	signed: boolean
	signedAt: string | null
}) {
	return (
		<div className="flex-between py-2 px-3 rounded-md bg-muted/50">
			<span className="typography-small">{label}</span>
			<div className="flex items-center gap-2">
				{signed ? (
					<>
						<CheckCircle2 className="h-4 w-4 text-success" />
						<span className="text-sm text-success">
							Signed {signedAt && new Date(signedAt).toLocaleDateString()}
						</span>
					</>
				) : (
					<>
						<Clock className="h-4 w-4 text-warning" />
						<span className="text-muted">Pending</span>
					</>
				)}
			</div>
		</div>
	)
}

export { SignatureBadge, SignatureRow }
