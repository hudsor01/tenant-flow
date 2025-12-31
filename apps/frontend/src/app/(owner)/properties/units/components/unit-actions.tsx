'use client'

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
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Input } from '#components/ui/input'
import { useDeleteUnitMutation } from '#hooks/api/mutations/unit-mutations'
import { cn } from '#lib/utils'
import { buttonVariants } from '#components/ui/button'
import { cardVariants } from '#components/ui/card'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { UnitRowWithRelations as UnitRow, UnitStatus } from '@repo/shared/types/core'
import {
	AlertTriangle,
	BedDouble,
	DollarSign,
	EditIcon,
	EyeIcon,
	MoreHorizontalIcon,
	Ruler,
	ShowerHead,
	TrashIcon
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { UnitStatusBadge, statusConfig } from './unit-status-badge'

interface UnitActionsProps {
	unit: UnitRow
}

export function UnitActions({ unit }: UnitActionsProps) {
	const logger = createLogger({ component: 'UnitActions' })
	const [viewOpen, setViewOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState(false)
	const [deleteOpen, setDeleteOpen] = React.useState(false)
	const [isDeleting, setIsDeleting] = React.useState(false)

	const deleteUnit = useDeleteUnitMutation()

	const handleDelete = async () => {
		setIsDeleting(true)
		try {
			await deleteUnit.mutateAsync(unit.id)
			toast.success(`Unit ${unit.unit_number} has been deleted successfully`)
			setDeleteOpen(false)
		} catch (error) {
			logger.error('Unit deletion operation failed', {
				action: 'unit_delete_failed',
				metadata: {
					unit_id: unit.id,
					unit_number: unit.unit_number,
					error: error instanceof Error ? error.message : String(error)
				}
			})
			toast.error('Failed to delete unit. Please try again.')
		} finally {
			setIsDeleting(false)
		}
	}

	// Don't allow deletion of occupied units
	const canDelete = unit.status !== 'occupied'
	const config = statusConfig[unit.status as UnitStatus]

	return (
		<>
			<div className="flex-center">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								buttonVariants({ variant: 'ghost', size: 'sm' }),
								'size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50',
								'transition-all'
							)}
						>
							<span className="sr-only">
								Open actions menu for unit {unit.unit_number}
							</span>
							<MoreHorizontalIcon className="size-4" />
							{config.icon && (
								<config.icon className="size-2 absolute -top-1 -right-1 opacity-60" />
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Unit {unit.unit_number} Actions
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => setViewOpen(true)}
							className="gap-2 cursor-pointer"
						>
							<EyeIcon className="size-4 text-primary" />
							<span>View Details</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setEditOpen(true)}
							className="gap-2 cursor-pointer"
						>
							<EditIcon className="size-4 text-accent" />
							<span>Edit Unit</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => setDeleteOpen(true)}
							disabled={!canDelete}
							className={cn(
								'gap-2',
								canDelete
									? 'cursor-pointer text-destructive focus:text-destructive'
									: 'opacity-50 cursor-not-allowed'
							)}
						>
							<TrashIcon className="size-4" />
							<span>Delete Unit</span>
							{!canDelete && (
								<Badge variant="secondary" className="ml-auto text-xs">
									Occupied
								</Badge>
							)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* VIEW DIALOG - Inline read-only unit details */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Unit {unit.unit_number} Details</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-2">
								<BedDouble className="size-4 text-muted-foreground" />
								<span>{unit.bedrooms} Bedrooms</span>
							</div>
							<div className="flex items-center gap-2">
								<ShowerHead className="size-4 text-muted-foreground" />
								<span>{unit.bathrooms} Bathrooms</span>
							</div>
							{unit.square_feet && (
								<div className="flex items-center gap-2">
									<Ruler className="size-4 text-muted-foreground" />
									<span>{unit.square_feet} sq ft</span>
								</div>
							)}
							<div className="flex items-center gap-2">
								<DollarSign className="size-4 text-muted-foreground" />
								<span>${unit.rent_amount}/month</span>
							</div>
						</div>
						<div>
							<Label>Status</Label>
							<div className="mt-1">
								<UnitStatusBadge status={unit.status as UnitStatus} />
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* EDIT DIALOG - Inline read-only for now (backend handles updates) */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Unit {unit.unit_number}</DialogTitle>
						<DialogDescription>View unit details</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Unit Number</Label>
							<Input value={unit.unit_number || ''} disabled />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Bedrooms</Label>
								<Input type="number" value={unit.bedrooms ?? ''} disabled />
							</div>
							<div>
								<Label>Bathrooms</Label>
								<Input type="number" value={unit.bathrooms ?? ''} disabled />
							</div>
						</div>
						<div>
							<Label>Square Feet</Label>
							<Input type="number" value={unit.square_feet || ''} disabled />
						</div>
						<div>
							<Label>Rent Amount</Label>
							<Input type="number" value={unit.rent_amount} disabled />
						</div>
						<div>
							<Label>Status</Label>
							<Select value={unit.status} disabled>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="OCCUPIED">Occupied</SelectItem>
									<SelectItem value="available">Vacant</SelectItem>
									<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
									<SelectItem value="RESERVED">Reserved</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent
					className={cn(cardVariants({ variant: 'elevated' }), 'max-w-md')}
				>
					<AlertDialogHeader className="space-y-4">
						<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
							<TrashIcon className="size-6 text-destructive" />
						</div>
						<AlertDialogTitle className="text-center typography-large">
							Delete Unit {unit.unit_number}?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center text-muted-foreground">
							This action cannot be undone. The unit will be permanently removed
							from your property management system.
							{unit.status === 'occupied' && (
								<div
									className={cn(
										cardVariants({ variant: 'default' }),
										'mt-4 p-3 border-destructive/20 bg-destructive/5'
									)}
								>
									<div className="flex items-center gap-2 text-destructive">
										<AlertTriangle className="size-4" />
										<span className="font-medium text-sm">
											This unit is currently occupied and cannot be deleted.
										</span>
									</div>
								</div>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex gap-3">
						<AlertDialogCancel
							disabled={isDeleting}
							className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting || !canDelete}
							className={cn(
								buttonVariants({ variant: 'destructive' }),
								'flex-1'
							)}
						>
							{isDeleting ? (
								<div className="flex items-center gap-2">
									<div
										className="size-4 animate-spin rounded-full border-2"
										style={{
											borderColor:
												'color-mix(in oklab, var(--color-fill-secondary) 60%, transparent)',
											borderTopColor: 'var(--color-label-primary)'
										}}
									/>
									<span>Deleting...</span>
								</div>
							) : (
								'Delete Unit'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
