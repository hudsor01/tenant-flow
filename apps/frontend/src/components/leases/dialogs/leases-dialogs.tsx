'use client'

import { RenewLeaseDialog } from './renew-lease-dialog'
import { TerminateLeaseDialog } from './terminate-lease-dialog'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import type { Lease } from '@repo/shared/types/core'

interface LeasesDialogsProps {
	selectedLease: Lease | null
	showRenewDialog: boolean
	showTerminateDialog: boolean
	showDeleteDialog: boolean
	isDeleting: boolean
	onRenewOpenChange: (open: boolean) => void
	onTerminateOpenChange: (open: boolean) => void
	onDeleteOpenChange: (open: boolean) => void
	onRenewSuccess: () => void
	onTerminateSuccess: () => void
	onDeleteConfirm: () => void
}

export function LeasesDialogs({
	selectedLease,
	showRenewDialog,
	showTerminateDialog,
	showDeleteDialog,
	isDeleting,
	onRenewOpenChange,
	onTerminateOpenChange,
	onDeleteOpenChange,
	onRenewSuccess,
	onTerminateSuccess,
	onDeleteConfirm
}: LeasesDialogsProps) {
	if (!selectedLease) return null

	return (
		<>
			<RenewLeaseDialog
				open={showRenewDialog}
				onOpenChange={onRenewOpenChange}
				lease={selectedLease}
				onSuccess={onRenewSuccess}
			/>
			<TerminateLeaseDialog
				open={showTerminateDialog}
				onOpenChange={onTerminateOpenChange}
				lease={selectedLease}
				onSuccess={onTerminateSuccess}
			/>
			<ConfirmDialog
				open={showDeleteDialog}
				onOpenChange={onDeleteOpenChange}
				title="Delete Lease"
				description="Are you sure you want to delete this lease? This action cannot be undone."
				confirmText="Delete Lease"
				onConfirm={onDeleteConfirm}
				loading={isDeleting}
			/>
		</>
	)
}
