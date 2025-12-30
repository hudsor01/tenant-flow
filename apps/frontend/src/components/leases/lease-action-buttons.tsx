'use client'

import { useState } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogBody
} from '#components/ui/dialog'
import type { Lease } from '@repo/shared/types/core'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { RenewLeaseDialog } from '#components/leases/renew-lease-dialog'
import { TerminateLeaseDialog } from '#components/leases/terminate-lease-dialog'
import { PayRentDialog } from '#components/leases/pay-rent-dialog'
import { SendForSignatureButton } from '#components/leases/send-for-signature-button'
import type { LeaseWithExtras } from '@repo/shared/types/core'
import {
	CreditCard,
	Eye,
	MoreVertical,
	PenLine,
	RotateCcw,
	Trash2,
	X
} from 'lucide-react'
import { LEASE_STATUS } from '#lib/constants/status-values'
import { useDeleteLease, useSignLeaseAsOwner } from '#hooks/api/use-lease'
import { toast } from 'sonner'

interface LeaseActionButtonsProps {
	lease: Lease
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
	const signAsOwner = useSignLeaseAsOwner()
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [showViewDialog, setShowViewDialog] = useState(false)
	const [showPayRentDialog, setShowPayRentDialog] = useState(false)
	const [showRenewDialog, setShowRenewDialog] = useState(false)
	const [showTerminateDialog, setShowTerminateDialog] = useState(false)
	const deleteLease = useDeleteLease({
		onSuccess: () => {
			toast.success('Lease deleted successfully')
			setShowDeleteDialog(false)
		},
		onError: () => {
			toast.error('Failed to delete lease')
		}
	})

	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature =
		lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const ownerHasSigned = !!lease.owner_signed_at

	const handleSignAsOwner = async () => {
		try {
			await signAsOwner.mutateAsync(lease.id)
			toast.success('Lease signed successfully')
		} catch {
			toast.error('Failed to sign lease')
		}
	}

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			active: 'default',
			EXPIRED: 'destructive',
			TERMINATED: 'secondary',
			DRAFT: 'outline',
			pending_signature: 'secondary'
		}

		const labels: Record<string, string> = {
			pending_signature: 'Pending Signature'
		}

		return (
			<Badge variant={variants[status] || 'outline'}>
				{labels[status] || status}
			</Badge>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setShowViewDialog(true)}
				className="gap-2"
			>
				<Eye className="size-4" />
				View
			</Button>

			{isDraft && (
				<SendForSignatureButton
					leaseId={lease.id}
					variant="outline"
					size="sm"
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" aria-label="Lease actions">
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{isPendingSignature && !ownerHasSigned && (
						<>
							<DropdownMenuItem
								onClick={handleSignAsOwner}
								disabled={signAsOwner.isPending}
								className="gap-2"
							>
								<PenLine className="size-4" />
								{signAsOwner.isPending ? 'Signing...' : 'Sign as Owner'}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}

					{lease.lease_status === 'active' && (
						<>
							<DropdownMenuItem
								onClick={() => setShowPayRentDialog(true)}
								className="gap-2"
							>
								<CreditCard className="size-4" />
								Pay Rent
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem
								onClick={() => setShowRenewDialog(true)}
								className="gap-2"
							>
								<RotateCcw className="size-4" />
								Renew Lease
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => setShowTerminateDialog(true)}
								className="gap-2 text-destructive focus:text-destructive"
							>
								<X className="size-4" />
								Terminate Lease
							</DropdownMenuItem>
						</>
					)}

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => setShowDeleteDialog(true)}
						className="gap-2 text-destructive focus:text-destructive"
					>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Lease</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this lease? This action cannot be
							undone and will remove all associated payment records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteLease.mutate(lease.id)}
							disabled={deleteLease.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteLease.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{getStatusBadge(lease.lease_status)}

			<Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
				<DialogContent intent="read">
					<DialogHeader>
						<DialogTitle>Lease Details</DialogTitle>
						<DialogDescription>View lease information</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div>
							<Label>Start Date</Label>
							<Input type="date" value={lease.start_date} disabled />
						</div>
						<div>
							<Label>End Date</Label>
							<Input type="date" value={lease.end_date || ''} disabled />
						</div>
						<div>
							<Label>Rent Amount</Label>
							<Input type="number" value={lease.rent_amount} disabled />
						</div>
						<div>
							<Label>Security Deposit</Label>
							<Input type="number" value={lease.security_deposit} disabled />
						</div>
						<div>
							<Label>Status</Label>
							{getStatusBadge(lease.lease_status)}
						</div>
					</DialogBody>
				</DialogContent>
			</Dialog>

			{/* Pay Rent Dialog */}
			{showPayRentDialog && lease.lease_status === 'active' && (
				<PayRentDialog
					open={showPayRentDialog}
					onOpenChange={setShowPayRentDialog}
					lease={lease as LeaseWithExtras}
					onSuccess={() => setShowPayRentDialog(false)}
				/>
			)}

			{/* Renew Lease Dialog */}
			{showRenewDialog && lease.lease_status === 'active' && (
				<RenewLeaseDialog
					open={showRenewDialog}
					onOpenChange={setShowRenewDialog}
					lease={lease}
					onSuccess={() => setShowRenewDialog(false)}
				/>
			)}

			{/* Terminate Lease Dialog */}
			{showTerminateDialog && lease.lease_status === 'active' && (
				<TerminateLeaseDialog
					open={showTerminateDialog}
					onOpenChange={setShowTerminateDialog}
					lease={lease}
					onSuccess={() => setShowTerminateDialog(false)}
				/>
			)}
		</div>
	)
}
