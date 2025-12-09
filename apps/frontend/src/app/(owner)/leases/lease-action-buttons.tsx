'use client'

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
} from '#components/ui/alert-dialog'
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
	CrudDialog,
	CrudDialogContent,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogDescription,
	CrudDialogBody
} from '#components/ui/crud-dialog'
import { useModalStore } from '#stores/modal-store'
import type { Lease } from '@repo/shared/types/core'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	CreditCard,
	Eye,
	MoreVertical,
	PenLine,
	RotateCcw,
	Send,
	Trash2,
	X
} from 'lucide-react'
import { LEASE_STATUS } from '#lib/constants/status-values'
import { useSendLeaseForSignature, useSignLeaseAsOwner } from '#hooks/api/use-lease'
import { toast } from 'sonner'

interface LeaseActionButtonsProps {
	lease: Lease
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
	const { openModal } = useModalStore()
	const sendForSignature = useSendLeaseForSignature()
	const signAsOwner = useSignLeaseAsOwner()

	const isDraft = lease.lease_status === LEASE_STATUS.DRAFT
	const isPendingSignature = lease.lease_status === LEASE_STATUS.PENDING_SIGNATURE
	const ownerHasSigned = !!lease.owner_signed_at

	const handleSendForSignature = async () => {
		try {
			await sendForSignature.mutateAsync({ leaseId: lease.id })
			toast.success('Lease sent for signature')
		} catch {
			toast.error('Failed to send lease for signature')
		}
	}

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

		return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>
	}

	return (
		<div className="flex items-center gap-2">
			{/* Primary Action: View Details */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => openModal(`view-lease-${lease.id}`)}
				className="gap-2"
			>
				<Eye className="size-4" />
				View
			</Button>

			{/* Secondary Actions Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
				{/* Draft lease actions */}
				{isDraft && (
					<>
						<DropdownMenuItem
							onClick={handleSendForSignature}
							disabled={sendForSignature.isPending}
							className="gap-2"
						>
							<Send className="size-4" />
							{sendForSignature.isPending ? 'Sending...' : 'Send for Signature'}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}

				{/* Pending signature actions */}
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

				{/* Active lease actions */}
				{lease.lease_status === 'active' && (
					<>
						<DropdownMenuItem
							onClick={() => openModal(`pay-rent-${lease.id}`)}
							className="gap-2"
						>
							<CreditCard className="size-4" />
							Pay Rent
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							onClick={() => openModal(`renew-lease-${lease.id}`)}
							className="gap-2"
						>
							<RotateCcw className="size-4" />
							Renew Lease
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={() => openModal(`terminate-lease-${lease.id}`)}
							className="gap-2 text-destructive focus:text-destructive"
						>
							<X className="size-4" />
							Terminate Lease
						</DropdownMenuItem>
					</>
				)}

				<DropdownMenuSeparator />

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<DropdownMenuItem
								onSelect={e => e.preventDefault()}
								className="gap-2 text-destructive focus:text-destructive"
							>
								<Trash2 className="size-4" />
								Delete
							</DropdownMenuItem>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Lease</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete this lease? This action cannot be undone
									and will remove all associated payment records.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										// TODO: Implement lease deletion mutation
										toast.info('Lease deletion not yet implemented')
									}}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Status Badge */}
			{getStatusBadge(lease.lease_status)}

			{/* Modal Components */}
			<CrudDialog mode="read" modalId={`edit-lease-${lease.id}`}>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Lease Details</CrudDialogTitle>
						<CrudDialogDescription>View lease information</CrudDialogDescription>
					</CrudDialogHeader>
					<CrudDialogBody>
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
					</CrudDialogBody>
				</CrudDialogContent>
			</CrudDialog>
		</div>
	)
}
