'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { CrudDialog, CrudDialogContent, CrudDialogHeader, CrudDialogTitle, CrudDialogDescription, CrudDialogBody } from '#components/ui/crud-dialog'
import { useModalStore } from '#stores/modal-store'
import type { Tables } from '@repo/shared/types/supabase'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	CreditCard,
	Eye,
	MoreVertical,
	RotateCcw,
	Trash2,
	X
} from 'lucide-react'


type Lease = Tables<'lease'>

interface LeaseActionButtonsProps {
	lease: Lease
}

export function LeaseActionButtons({ lease }: LeaseActionButtonsProps) {
	const { openModal } = useModalStore()

	const getStatusBadge = (status: Lease['status']) => {
		const variants: Record<
			Lease['status'],
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			ACTIVE: 'default',
			EXPIRED: 'destructive',
			TERMINATED: 'secondary',
			DRAFT: 'outline'
		}

		return <Badge variant={variants[status]}>{status}</Badge>
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
					{lease.status === 'ACTIVE' && (
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

					<DropdownMenuItem
						onClick={() => {
							if (confirm('Are you sure you want to delete this lease?')) {
								// handleDelete(lease.id)
							}
						}}
						className="gap-2 text-destructive focus:text-destructive"
					>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Status Badge */}
			{getStatusBadge(lease.status)}

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
					<Input type="date" value={lease.startDate} disabled />
				</div>
				<div>
					<Label>End Date</Label>
					<Input type="date" value={lease.endDate || ''} disabled />
				</div>
				<div>
					<Label>Rent Amount</Label>
					<Input type="number" value={lease.rentAmount} disabled />
				</div>
				<div>
					<Label>Security Deposit</Label>
					<Input type="number" value={lease.securityDeposit} disabled />
				</div>
				<div>
					<Label>Status</Label>
					{getStatusBadge(lease.status)}
				</div>
					</CrudDialogBody>
				</CrudDialogContent>
			</CrudDialog>
		</div>
	)
}
