import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useDeleteUnit } from '@/hooks/api/use-unit'
import {
	TYPOGRAPHY_SCALE,
	buttonClasses,
	cardClasses,
	cn,
	inputClasses
} from '@/lib/design-system'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { UnitStats } from '@repo/shared/types/core'
import type { UnitRow } from '@repo/shared/types/frontend'
import type { Column, ColumnDef } from '@tanstack/react-table'
import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
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
	Star,
	TrashIcon,
	TrendingUp,
	Users
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

// Re-export UnitRow for use in other components
export type { UnitRow }

// Enhanced unit type with comprehensive information - now imported from @repo/shared

type UnitStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | 'RESERVED'

// Enhanced sortable header component with professional design
interface SortableHeaderProps {
	column: Column<UnitRow, unknown>
	children: React.ReactNode
	className?: string
	align?: 'left' | 'center' | 'right'
}

function SortableHeader({
	column,
	children,
	className,
	align = 'left'
}: SortableHeaderProps) {
	const sortDirection = column.getIsSorted()
	const isActive = sortDirection !== false

	const alignmentClasses = {
		left: 'justify-start',
		center: 'justify-center',
		right: 'justify-end'
	}

	return (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			className={cn(
				buttonClasses('ghost', 'sm'),
				'h-auto p-2 font-semibold hover:bg-muted/50 transition-all',
				alignmentClasses[align],
				'gap-2',
				isActive && 'text-primary',
				className,
				'text-[15px] leading-[1.33] font-normal duration-150'
			)}
		>
			<div className="flex items-center gap-2">
				{children}
				<div className="size-4 flex items-center justify-center">
					{sortDirection === 'desc' ? (
						<ArrowDown
							className={cn(
							'h-3.5 w-3.5 transition-all duration-150',
							isActive ? 'text-primary' : 'text-muted-foreground'
						)}
							
						/>
					) : sortDirection === 'asc' ? (
						<ArrowUp
							className={cn(
							'h-3.5 w-3.5 transition-all duration-150',
							isActive ? 'text-primary' : 'text-muted-foreground'
						)}
							
						/>
					) : (
						<ArrowUpDown
							className="h-3.5 w-3.5 opacity-50 transition-opacity hover:opacity-75 duration-150"
							
						/>
					)}
				</div>
			</div>
		</Button>
	)
}

// Enhanced status configuration with icons and semantic meaning
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
	OCCUPIED: {
		variant: 'default',
		label: 'Occupied',
		icon: Users,
		className:
			'bg-accent/10 text-accent-foreground border-accent/20 dark:bg-accent/20 dark:text-accent dark:border-accent/80',
		priority: 1
	},
	VACANT: {
		variant: 'secondary',
		label: 'Available',
		icon: Home,
		className:
			'bg-primary/10 text-primary-foreground border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/80',
		priority: 2
	},
	MAINTENANCE: {
		variant: 'destructive',
		label: 'Maintenance',
		icon: AlertTriangle,
		className:
			'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/80',
		priority: 4
	},
	RESERVED: {
		variant: 'outline',
		label: 'Reserved',
		icon: Calendar,
		className:
			'bg-muted/10 text-muted-foreground border-muted/20 dark:bg-muted/20 dark:text-muted dark:border-muted/80',
		priority: 3
	}
}

// Enhanced unit stats display component
const UnitStatsDisplay: React.FC<{ stats: UnitStats; className?: string }> = ({
	stats,
	className
}) => {
	return (
		<div className={cn('flex gap-2', className)}>
			<input
				type="text"
				readOnly
				value={`${stats.occupied}/${stats.total} occupied`}
				className={cn(
					inputClasses('default', 'xs'),
					'text-center pointer-events-none bg-muted/50'
				)}
			/>
			<input
				type="text"
				readOnly
				value={`${((stats.occupied / stats.total) * 100).toFixed(1)}%`}
				className={cn(
					inputClasses('default', 'xs'),
					'text-center pointer-events-none bg-primary/10'
				)}
			/>
		</div>
	)
}

// Enhanced status badge component
const UnitStatusBadge: React.FC<{ status: UnitStatus; className?: string }> = ({
	status,
	className
}) => {
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

	const deleteUnit = useDeleteUnit({
		onSuccess: () => {
			toast.success('Unit deleted successfully')
		},
		onError: (err: Error) => {
			toast.error('Failed to delete unit', {
				description: err.message
			})
		}
	})

	const handleDelete = async () => {
		setIsDeleting(true)
		try {
			await deleteUnit.mutateAsync(unit.id)
			toast.success(`Unit ${unit.unitNumber} has been deleted successfully`)
			setDeleteOpen(false)
		} catch (error) {
			logger.error('Unit deletion operation failed', {
				action: 'unit_delete_failed',
				metadata: {
					unitId: unit.id,
					unitNumber: unit.unitNumber,
					error: error instanceof Error ? error.message : String(error)
				}
			})
			toast.error('Failed to delete unit. Please try again.')
		} finally {
			setIsDeleting(false)
		}
	}

	// Don't allow deletion of occupied units
	const canDelete = unit.status !== 'OCCUPIED'
	const config = statusConfig[unit.status as UnitStatus]

	return (
		<>
			<div className="flex items-center justify-center">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								buttonClasses('ghost', 'sm'),
								'size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50',
								'transition-all'
							)}
							
						>
							<span className="sr-only">
								Open actions menu for unit {unit.unitNumber}
							</span>
							<MoreHorizontalIcon className="size-4" />
							{config.icon && (
								<config.icon className="size-2 absolute -top-1 -right-1 opacity-60" />
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel
							className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
							style={TYPOGRAPHY_SCALE['body-xs']}
						>
							Unit {unit.unitNumber} Actions
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
						<DialogTitle>Unit {unit.unitNumber} Details</DialogTitle>
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
							{unit.squareFeet && (
								<div className="flex items-center gap-2">
									<Ruler className="size-4 text-muted-foreground" />
									<span>{unit.squareFeet} sq ft</span>
								</div>
							)}
							<div className="flex items-center gap-2">
								<DollarSign className="size-4 text-muted-foreground" />
								<span>${unit.rent}/month</span>
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
						<DialogTitle>Unit {unit.unitNumber}</DialogTitle>
						<DialogDescription>View unit details</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Unit Number</Label>
							<Input value={unit.unitNumber} disabled />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Bedrooms</Label>
								<Input type="number" value={unit.bedrooms} disabled />
							</div>
							<div>
								<Label>Bathrooms</Label>
								<Input type="number" value={unit.bathrooms} disabled />
							</div>
						</div>
						<div>
							<Label>Square Feet</Label>
							<Input type="number" value={unit.squareFeet || ''} disabled />
						</div>
						<div>
							<Label>Rent Amount</Label>
							<Input type="number" value={unit.rent} disabled />
						</div>
						<div>
							<Label>Status</Label>
							<Select value={unit.status} disabled>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="OCCUPIED">Occupied</SelectItem>
									<SelectItem value="VACANT">Vacant</SelectItem>
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
				<AlertDialogContent className={cn(cardClasses('elevated'), 'max-w-md')}>
					<AlertDialogHeader className="space-y-4">
						<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
							<TrashIcon className="size-6 text-destructive" />
						</div>
						<AlertDialogTitle
							className="text-center"
							style={TYPOGRAPHY_SCALE['heading-sm']}
						>
							Delete Unit {unit.unitNumber}?
						</AlertDialogTitle>
						<AlertDialogDescription
							className="text-center text-muted-foreground"
							style={TYPOGRAPHY_SCALE['body-md']}
						>
							This action cannot be undone. The unit will be permanently removed
							from your property management system.
							{unit.status === 'OCCUPIED' && (
								<div
									className={cn(
										cardClasses('default'),
										'mt-4 p-3 border-destructive/20 bg-destructive/5'
									)}
								>
									<div className="flex items-center gap-2 text-destructive">
										<AlertTriangle className="size-4" />
										<span
											className="font-medium text-sm"
											style={TYPOGRAPHY_SCALE['body-xs']}
										>
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
							className={cn(buttonClasses('outline'), 'flex-1')}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting || !canDelete}
							className={cn(buttonClasses('destructive'), 'flex-1')}
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

// Enhanced column definitions with professional design and comprehensive data display
export const unitColumns: ColumnDef<UnitRow>[] = [
	{
		accessorKey: 'unitNumber',
		header: ({ column }) => (
			<SortableHeader column={column} align="left">
				<Home className="size-4" />
				Unit Details
			</SortableHeader>
		),
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			return (
				<div className="flex flex-col gap-1 py-2">
					<div
						className="font-bold text-foreground"
						style={TYPOGRAPHY_SCALE['body-md']}
					>
						Unit {row.getValue('unitNumber')}
					</div>
					{unit.property && (
						<div
							className="text-muted-foreground text-xs"
							style={TYPOGRAPHY_SCALE['body-xs']}
						>
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
		id: 'layout',
		header: ({ column }) => (
			<SortableHeader column={column} align="center">
				<Bed className="size-4" />
				Layout
			</SortableHeader>
		),
		accessorFn: row => `${row.bedrooms}bed${row.bathrooms}bath`,
		cell: ({ row }) => {
			const bedrooms = row.getValue('bedrooms') as number
			const bathrooms = row.getValue('bathrooms') as number
			const squareFeet = row.getValue('squareFeet') as number | null

			return (
				<div className="text-center space-y-1">
					<div className="flex items-center justify-center gap-3">
						<div className="flex items-center gap-1">
							<Bed className="size-3 text-muted-foreground" />
							<span className="font-medium" style={TYPOGRAPHY_SCALE['body-md']}>
								{bedrooms}
							</span>
						</div>
						<div className="flex items-center gap-1">
							<Bath className="size-3 text-muted-foreground" />
							<span className="font-medium" style={TYPOGRAPHY_SCALE['body-md']}>
								{bathrooms}
							</span>
						</div>
					</div>
					{squareFeet && (
						<div className="flex items-center justify-center gap-1">
							<Maximize2 className="size-3 text-muted-foreground" />
							<span
								className="text-muted-foreground text-xs"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								{squareFeet.toLocaleString()} ft²
							</span>
						</div>
					)}
				</div>
			)
		},
		sortingFn: (rowA, rowB) => {
			const layoutA = rowA.original.bedrooms * 10 + rowA.original.bathrooms
			const layoutB = rowB.original.bedrooms * 10 + rowB.original.bathrooms
			return layoutA - layoutB
		},
		size: 120
	},
	{
		accessorKey: 'rent',
		header: ({ column }) => (
			<SortableHeader column={column} align="right">
				<DollarSign className="size-4" />
				Rent & Value
			</SortableHeader>
		),
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			const rent = parseFloat(row.getValue('rent'))
			const marketValue = unit.marketValue || rent
			const variance =
				marketValue !== rent ? ((rent - marketValue) / marketValue) * 100 : 0

			const rentFormatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 0
			}).format(rent)

			return (
				<div className="text-right space-y-1 py-2">
					<div
						className="font-bold text-foreground"
						style={TYPOGRAPHY_SCALE['body-md']}
					>
						{rentFormatted}
					</div>
					<div
						className="text-muted-foreground text-xs"
						style={TYPOGRAPHY_SCALE['body-xs']}
					>
						per month
					</div>
					{variance !== 0 && (
						<div className="flex items-center justify-end gap-1">
							<TrendingUp
								className={cn(
									'size-3',
									variance > 0 ? 'text-accent' : 'text-destructive'
								)}
							/>
							<span
								className={cn(
									'text-xs font-medium',
									variance > 0 ? 'text-accent' : 'text-destructive'
								)}
							>
								{variance > 0 ? '+' : ''}
								{variance.toFixed(1)}%
							</span>
						</div>
					)}
				</div>
			)
		},
		size: 140
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<SortableHeader column={column} align="left">
				Status & Tenant
			</SortableHeader>
		),
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			const status = row.getValue('status') as UnitStatus

			return (
				<div className="space-y-2 py-2">
					<UnitStatusBadge status={status} />
					{unit.tenant && status === 'OCCUPIED' && (
						<div className="space-y-1">
							<div
								className="font-medium text-foreground text-sm"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								{unit.tenant.name}
							</div>
							<div
								className="text-muted-foreground text-xs"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
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
		id: 'lastUpdated',
		accessorKey: 'lastUpdated',
		header: ({ column }) => (
			<SortableHeader column={column} align="center">
				<Calendar className="size-4" />
				Last Updated
			</SortableHeader>
		),
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			const lastUpdated = unit.lastUpdated || new Date().toISOString()
			const date = new Date(lastUpdated)
			const isRecent = Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days

			return (
				<div className="text-center space-y-1">
					<div
						className="font-medium text-foreground"
						style={TYPOGRAPHY_SCALE['body-xs']}
					>
						{date.toLocaleDateString()}
					</div>
					<div
						className={cn(
							'text-xs',
							isRecent ? 'text-accent' : 'text-muted-foreground'
						)}
						style={TYPOGRAPHY_SCALE['body-xs']}
					>
						{isRecent && <Star className="size-3 inline mr-1" />}
						{date.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric'
						})}
					</div>
				</div>
			)
		},
		size: 120
	},
	{
		id: 'actions',
		header: () => (
			<div
				className="text-center font-semibold text-muted-foreground"
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				Actions
			</div>
		),
		cell: ({ row }) => <UnitActions unit={row.original} />,
		enableSorting: false,
		enableHiding: false,
		size: 80
	}
]
