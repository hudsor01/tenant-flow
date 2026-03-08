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
} from '#components/ui/alert-dialog'
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
import { useDeleteUnitMutation } from '#hooks/api/use-unit'
import { cn } from '#lib/utils'
import { buttonVariants } from '#components/ui/button'
import { cardVariants } from '#components/ui/card'
import { createLogger } from '#lib/frontend-logger.js'
import type { UnitRowWithRelations as UnitRow, UnitStatus } from '#types/core'
import { AlertTriangle, EditIcon, EyeIcon, MoreHorizontalIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { statusConfig } from './unit-status-badge'
import { UnitViewDialog, UnitEditDialog } from './unit-detail-dialogs'

interface UnitActionsProps {
	unit: UnitRow
}

export function UnitActions({ unit }: UnitActionsProps) {
	const logger = createLogger({ component: 'UnitActions' })
	const [viewOpen, setViewOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
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
				metadata: { unit_id: unit.id, unit_number: unit.unit_number, error: error instanceof Error ? error.message : String(error) }
			})
			toast.error('Failed to delete unit. Please try again.')
		} finally {
			setIsDeleting(false)
		}
	}

	const canDelete = unit.status !== 'occupied'
	const config = statusConfig[unit.status as UnitStatus]

	return (
		<>
			<div className="flex-center">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all')}>
							<span className="sr-only">Open actions menu for unit {unit.unit_number}</span>
							<MoreHorizontalIcon className="size-4" />
							{config.icon && <config.icon className="size-2 absolute -top-1 -right-1 opacity-60" />}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit {unit.unit_number} Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setViewOpen(true)} className="gap-2 cursor-pointer">
							<EyeIcon className="size-4 text-primary" /><span>View Details</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
							<EditIcon className="size-4 text-accent" /><span>Edit Unit</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setDeleteOpen(true)} disabled={!canDelete} className={cn('gap-2', canDelete ? 'cursor-pointer text-destructive focus:text-destructive' : 'opacity-50 cursor-not-allowed')}>
							<TrashIcon className="size-4" /><span>Delete Unit</span>
							{!canDelete && <Badge variant="secondary" className="ml-auto text-xs">Occupied</Badge>}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<UnitViewDialog unit={unit} open={viewOpen} onOpenChange={setViewOpen} />
			<UnitEditDialog unit={unit} open={editOpen} onOpenChange={setEditOpen} />

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent className={cn(cardVariants({ variant: 'elevated' }), 'max-w-md')}>
					<AlertDialogHeader className="space-y-4">
						<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
							<TrashIcon className="size-6 text-destructive" />
						</div>
						<AlertDialogTitle className="text-center typography-large">Delete Unit {unit.unit_number}?</AlertDialogTitle>
						<AlertDialogDescription className="text-center text-muted-foreground">
							This action cannot be undone. The unit will be permanently removed from your property management system.
							{unit.status === 'occupied' && (
								<div className={cn(cardVariants({ variant: 'default' }), 'mt-4 p-3 border-destructive/20 bg-destructive/5')}>
									<div className="flex items-center gap-2 text-destructive">
										<AlertTriangle className="size-4" />
										<span className="font-medium text-sm">This unit is currently occupied and cannot be deleted.</span>
									</div>
								</div>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex gap-3">
						<AlertDialogCancel disabled={isDeleting} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting || !canDelete} className={cn(buttonVariants({ variant: 'destructive' }), 'flex-1')}>
							{isDeleting ? (
								<div className="flex items-center gap-2">
									<div className="size-4 animate-spin rounded-full border-2" style={{ borderColor: 'color-mix(in oklab, var(--color-fill-secondary) 60%, transparent)', borderTopColor: 'var(--color-label-primary)' }} />
									<span>Deleting...</span>
								</div>
							) : 'Delete Unit'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
