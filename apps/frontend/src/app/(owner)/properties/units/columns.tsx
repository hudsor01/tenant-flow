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
import { DataTableColumnHeader } from '#components/data-table/data-table-column-header'
import { useDeleteUnitMutation } from '#hooks/api/mutations/unit-mutations'
import { cn } from '#lib/utils'
import { buttonVariants } from '#components/ui/button'
import { cardVariants } from '#components/ui/card'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { UnitStats, UnitRowWithRelations as UnitRow, UnitStatus } from '@repo/shared/types/core'
import type { ColumnDef } from '@tanstack/react-table'
import {
	AlertTriangle,
	Bath,
	Bed,
	BedDouble,
	Calendar,
	DollarSign,
	EditIcon,
	EyeIcon,
	Home,
	MapPin,
	Maximize2,
	MoreHorizontalIcon,
	Ruler,
	ShowerHead,
	TrashIcon,
	Users
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

// Re-export UnitRow for use in other components
export type { UnitRow }

// Enhanced status configuration with icons and semantic meaning
// Keys match DB enum values (lowercase)
const statusConfig: Record<
	UnitStatus,
	{
		variant: 'default' | 'secondary' | 'destructive' | 'outline'
		label: string
		icon: React.ComponentType<{ className?: string }>
		className: string
		priority: number
	}
> = {
	occupied: {
		variant: 'default',
		label: 'Occupied',
		icon: Users,
		className:
			'bg-accent/10 text-accent-foreground border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/80',
		priority: 1
	},
	available: {
		variant: 'secondary',
		label: 'Available',
		icon: Home,
		className:
			'bg-primary/10 text-primary-foreground border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/80',
		priority: 2
	},
	maintenance: {
		variant: 'destructive',
		label: 'Maintenance',
		icon: AlertTriangle,
		className:
			'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/80',
		priority: 4
	},
	reserved: {
		variant: 'outline',
		label: 'Reserved',
		icon: Calendar,
		className:
			'bg-muted/10 text-muted-foreground border-muted/20 dark:bg-muted/20 dark:text-muted dark:border-muted/80',
		priority: 3
	}
}

// Enhanced unit stats display component
function UnitStatsDisplay({
	stats,
	className
}: { stats: UnitStats; className?: string }) {
	return (
		<div className={cn('flex gap-2', className)}>
			<input
				type="text"
				readOnly
				value={`${stats.occupied}/${stats.total} occupied`}
				className={cn(
					'h-8 px-2 py-1 text-xs rounded-md border border-input bg-transparent',
					'text-center pointer-events-none bg-muted/50'
				)}
			/>
			<input
				type="text"
				readOnly
				value={`${((stats.occupied / stats.total) * 100).toFixed(1)}%`}
				className={cn(
					'h-8 px-2 py-1 text-xs rounded-md border border-input bg-transparent',
					'text-center pointer-events-none bg-primary/10'
				)}
			/>
		</div>
	)
}

// Enhanced status badge component
function UnitStatusBadge({
	status,
	className
}: { status: UnitStatus; className?: string }) {
	const config = statusConfig[status]
	const IconComponent = config.icon

	return (
		<Badge
			variant={config.variant}
			className={cn(
				'flex items-center gap-1.5 px-3 py-1 font-medium text-xs rounded-full border transition-all',
				config.className,
				'hover:shadow-sm hover:scale-105',
				className
			)}
		>
			<IconComponent className="size-3" />
			{config.label}
		</Badge>
	)
}

interface UnitActionsProps {
	unit: UnitRow
}

function UnitActions({ unit }: UnitActionsProps) {
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
				<AlertDialogContent className={cn(cardVariants({ variant: 'elevated' }), 'max-w-md')}>
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
							className={cn(buttonVariants({ variant: 'destructive' }), 'flex-1')}
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

// Export the UnitStatsDisplay component for use in dashboard and analytics
export { UnitStatsDisplay }

// Enhanced column definitions with DiceUI DataTable
export const unitColumns: ColumnDef<UnitRow>[] = [
	{
		accessorKey: 'unit_number',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Unit Details" />
		),
		meta: {
			label: 'Unit',
			variant: 'text',
			placeholder: 'Search units...',
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			return (
				<div className="flex flex-col gap-1 py-2">
					<div className="font-bold text-foreground">
						Unit {row.getValue('unit_number')}
					</div>
					{unit.property && (
						<div className="text-muted-foreground text-xs">
							<MapPin className="size-3 inline mr-1" />
							{unit.property.name}
						</div>
					)}
				</div>
			)
		},
		size: 160,
		enableHiding: false
	},
	{
		accessorKey: 'bedrooms',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bedrooms" />
		),
		meta: {
			label: 'Bedrooms',
			variant: 'range',
			range: [0, 10],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bedrooms = row.getValue('bedrooms') as number
			return (
				<div className="flex items-center gap-1">
					<Bed className="size-3 text-muted-foreground" />
					<span className="font-medium">{bedrooms}</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'bathrooms',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bathrooms" />
		),
		meta: {
			label: 'Bathrooms',
			variant: 'range',
			range: [0, 10],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bathrooms = row.getValue('bathrooms') as number
			return (
				<div className="flex items-center gap-1">
					<Bath className="size-3 text-muted-foreground" />
					<span className="font-medium">{bathrooms}</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'square_feet',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Size" />
		),
		cell: ({ row }) => {
			const sqft = row.getValue('square_feet') as number | null
			if (!sqft) return <span className="text-muted-foreground">-</span>
			return (
				<div className="flex items-center gap-1">
					<Maximize2 className="size-3 text-muted-foreground" />
					<span className="text-xs">{sqft.toLocaleString()} ft²</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'rent_amount',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Rent" />
		),
		meta: {
			label: 'Rent',
			variant: 'range',
			range: [0, 10000],
			unit: '$',
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const rent = parseFloat(row.getValue('rent_amount'))
			const rentFormatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 0
			}).format(rent)

			return (
				<div className="text-right space-y-1 py-2">
					<div className="font-bold text-foreground">{rentFormatted}</div>
					<div className="text-muted-foreground text-xs">per month</div>
				</div>
			)
		},
		size: 120
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Status" />
		),
		meta: {
			label: 'Status',
			variant: 'select',
			options: [
				{ label: 'Occupied', value: 'occupied' },
				{ label: 'Vacant', value: 'available' },
				{ label: 'Maintenance', value: 'maintenance' },
				{ label: 'Reserved', value: 'reserved' },
			],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			const status = row.getValue('status') as UnitStatus

			return (
				<div className="space-y-2 py-2">
					<UnitStatusBadge status={status} />
					{unit.tenant && status === 'occupied' && (
						<div className="space-y-1">
							<div className="font-medium text-foreground text-sm">
								{unit.tenant.name}
							</div>
							<div className="text-muted-foreground text-xs">
								{unit.tenant.email}
							</div>
						</div>
					)}
				</div>
			)
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		sortingFn: (rowA, rowB) => {
			const statusA = rowA.getValue('status') as UnitStatus
			const statusB = rowB.getValue('status') as UnitStatus
			return statusConfig[statusA].priority - statusConfig[statusB].priority
		},
		size: 200
	},
	{
		id: 'actions',
		header: () => (
			<div className="text-center font-semibold text-muted-foreground">
				Actions
			</div>
		),
		cell: ({ row }) => <UnitActions unit={row.original} />,
		enableSorting: false,
		enableHiding: false,
		size: 80
	}
]
