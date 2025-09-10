import * as React from 'react'
import { MoreHorizontalIcon, EditIcon, EyeIcon, TrashIcon, Home, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { 
	cn, 
	buttonClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'

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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'

import { UnitEditDialog, UnitViewDialog } from './unit-dialogs'
import { useDeleteUnit } from '@/hooks/api/units'
import type { Database } from '@repo/shared'
import type { ColumnDef } from '@tanstack/react-table'
import type { Column } from '@tanstack/react-table'

export type UnitRow = Database['public']['Tables']['Unit']['Row']
type UnitStatus = Database['public']['Enums']['UnitStatus']

// Reusable sortable header component
interface SortableHeaderProps {
	column: Column<UnitRow, unknown>
	children: React.ReactNode
	className?: string
}

function SortableHeader({ column, children, className }: SortableHeaderProps) {
	const sortDirection = column.getIsSorted()
	
	return (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			className={cn(
				"h-auto p-0 font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",
				`transition-colors duration-[${ANIMATION_DURATIONS.fast}]`,
				className
			)}
		>
			<div className="flex items-center gap-2">
				{children}
				<div className="w-4 h-4 flex items-center justify-center">
					{sortDirection === "desc" ? (
						<ArrowDown className="h-3 w-3" />
					) : sortDirection === "asc" ? (
						<ArrowUp className="h-3 w-3" />
					) : (
						<ArrowUpDown className="h-3 w-3 opacity-50" />
					)}
				</div>
			</div>
		</Button>
	)
}

const statusConfig: Record<UnitStatus, { 
	variant: 'default' | 'secondary' | 'destructive' | 'outline'
	bgColor: string
	textColor: string
}> = {
	OCCUPIED: { 
		variant: 'default', 
		bgColor: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
		textColor: 'text-green-700 dark:text-green-300'
	},
	VACANT: { 
		variant: 'secondary', 
		bgColor: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
		textColor: 'text-blue-700 dark:text-blue-300'
	},
	MAINTENANCE: { 
		variant: 'destructive', 
		bgColor: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
		textColor: 'text-orange-700 dark:text-orange-300'
	},
	RESERVED: { 
		variant: 'outline', 
		bgColor: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
		textColor: 'text-purple-700 dark:text-purple-300'
	}
}

interface UnitActionsProps {
	unit: UnitRow
}

function UnitActions({ unit }: UnitActionsProps) {
	const [viewOpen, setViewOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState(false)
	const [deleteOpen, setDeleteOpen] = React.useState(false)
	const [isDeleting, setIsDeleting] = React.useState(false)

	const deleteUnit = useDeleteUnit()

	const handleDelete = async () => {
		setIsDeleting(true)
		try {
			await deleteUnit.mutateAsync(unit.id)
			toast.success(`Unit ${unit.unitNumber} has been deleted`)
			setDeleteOpen(false)
		} catch (error) {
			console.error('Failed to delete unit:', error)
			toast.error('Failed to delete unit. Please try again.')
		} finally {
			setIsDeleting(false)
		}
	}

	// Don't allow deletion of occupied units
	const canDelete = unit.status !== 'OCCUPIED'

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button 
						variant="ghost" 
						className={cn(
							"h-8 w-8 p-0 opacity-60 hover:opacity-100",
							"transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800",
							"rounded-6px"
						)}
					>
						<span className="sr-only">Open menu for unit {unit.unitNumber}</span>
						<MoreHorizontalIcon className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent 
					align="end"
					className={cn(
						"w-48 p-2 rounded-8px border shadow-lg",
						"animate-in slide-in-from-top-2",
						`duration-[${ANIMATION_DURATIONS.fast}ms]`
					)}
				>
					<DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1" style={{ fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize }}>
						Unit Actions
					</DropdownMenuLabel>
					<DropdownMenuItem
						onClick={() => setViewOpen(true)}
						className={cn(
							"flex items-center gap-2 rounded-6px px-2 py-2 text-sm",
							"hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
							`duration-[${ANIMATION_DURATIONS.fast}ms]`,
							"cursor-pointer text-blue-600 dark:text-blue-400"
						)}
					>
						<EyeIcon className="h-4 w-4" />
						View details
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setEditOpen(true)}
						className={cn(
							"flex items-center gap-2 rounded-6px px-2 py-2 text-sm",
							"hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
							`duration-[${ANIMATION_DURATIONS.fast}ms]`,
							"cursor-pointer text-amber-600 dark:text-amber-400"
						)}
					>
						<EditIcon className="h-4 w-4" />
						Edit unit
					</DropdownMenuItem>
					<DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-700" />
					<DropdownMenuItem
						onClick={() => setDeleteOpen(true)}
						disabled={!canDelete}
						className={cn(
							"flex items-center gap-2 rounded-6px px-2 py-2 text-sm",
							canDelete 
								? cn(
									"hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 cursor-pointer",
									`transition-colors duration-[${ANIMATION_DURATIONS.fast}ms]`
								)
								: "opacity-40 cursor-not-allowed text-gray-400"
						)}
					>
						<TrashIcon className="h-4 w-4" />
						Delete unit
						{!canDelete && (
							<span className="text-xs text-gray-400 ml-auto">(Occupied)</span>
						)}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<UnitViewDialog
				unit={unit}
				open={viewOpen}
				onOpenChange={setViewOpen}
			/>

			<UnitEditDialog
				unit={unit}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent className={cn(
					"rounded-12px border shadow-xl max-w-md",
					"animate-in fade-in-0 zoom-in-95",
					`duration-[${ANIMATION_DURATIONS.default}ms]`
				)}>
					<AlertDialogHeader className="space-y-3">
						<div className={cn(
							"w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20",
							"flex items-center justify-center mx-auto"
						)}>
							<TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
						</div>
						<AlertDialogTitle className="text-center text-gray-900 dark:text-gray-100 font-semibold" style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize, fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight, lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight }}>
							Delete Unit {unit.unitNumber}?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-center text-gray-600 dark:text-gray-400 leading-relaxed" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize, lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight }}>
							This action cannot be undone. This will permanently delete the unit
							and remove it from all systems.
							{unit.status === 'OCCUPIED' && (
								<span className={cn(
									"block mt-3 p-3 rounded-8px",
									"bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
									"text-red-700 dark:text-red-300 font-medium text-sm"
								)}>
									⚠️ This unit is currently occupied and cannot be deleted.
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex gap-3 pt-6">
						<AlertDialogCancel 
							disabled={isDeleting}
							className={cn(
								buttonClasses('outline'),
								"flex-1 rounded-8px",
								`transition-all duration-[${ANIMATION_DURATIONS.fast}ms]`,
								"hover:bg-gray-50 dark:hover:bg-gray-800"
							)}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting || !canDelete}
							className={cn(
								"flex-1 rounded-8px",
								"bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
								"text-white font-medium",
								`transition-all duration-[${ANIMATION_DURATIONS.fast}ms]`,
								"disabled:opacity-40 disabled:cursor-not-allowed",
								isDeleting && "animate-pulse"
							)}
						>
							{isDeleting ? (
								<span className="flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									Deleting...
								</span>
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

export const unitColumns: ColumnDef<UnitRow>[] = [
	{
		accessorKey: 'unitNumber',
		header: ({ column }) => (
			<SortableHeader column={column}>
				<Home className="h-4 w-4" />
				Unit #
			</SortableHeader>
		),
		cell: ({ row }) => (
			<div className="font-semibold text-gray-900 dark:text-gray-100" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
				{row.getValue('unitNumber')}
			</div>
		),
	},
	{
		accessorKey: 'bedrooms',
		header: ({ column }) => (
			<SortableHeader column={column} className="justify-center">
				Beds
			</SortableHeader>
		),
		cell: ({ row }) => (
			<div className="text-center font-medium text-gray-800 dark:text-gray-200" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
				{row.getValue('bedrooms')}
			</div>
		),
	},
	{
		accessorKey: 'bathrooms',
		header: ({ column }) => (
			<SortableHeader column={column} className="justify-center">
				Baths
			</SortableHeader>
		),
		cell: ({ row }) => (
			<div className="text-center font-medium text-gray-800 dark:text-gray-200" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
				{row.getValue('bathrooms')}
			</div>
		),
	},
	{
		accessorKey: 'squareFeet',
		header: ({ column }) => (
			<SortableHeader column={column} className="justify-center">
				Sq Ft
			</SortableHeader>
		),
		cell: ({ row }) => {
			const squareFeet = row.getValue('squareFeet') as number | null
			return (
				<div className="text-center font-medium text-gray-800 dark:text-gray-200" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
					{squareFeet ? squareFeet.toLocaleString() : '—'}
				</div>
			)
		},
	},
	{
		accessorKey: 'rent',
		header: ({ column }) => (
			<SortableHeader column={column} className="justify-end">
				<DollarSign className="h-4 w-4" />
				Monthly Rent
			</SortableHeader>
		),
		cell: ({ row }) => {
			const rent = parseFloat(row.getValue('rent'))
			const formatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
			}).format(rent)
			return (
				<div className="text-right font-bold text-green-600 dark:text-green-400" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
					{formatted}
				</div>
			)
		},
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<SortableHeader column={column}>
				Status
			</SortableHeader>
		),
		cell: ({ row }) => {
			const status = row.getValue('status') as UnitStatus
			const config = statusConfig[status]
			const statusIcons = {
				OCCUPIED: '🏠',
				VACANT: '🔑',
				MAINTENANCE: '🔧',
				RESERVED: '📋'
			}
			return (
				<Badge 
					variant={config.variant}
					className={cn(
						"capitalize font-medium border rounded-full px-3 py-1",
						config.bgColor,
						config.textColor,
						`transition-all duration-[${ANIMATION_DURATIONS.fast}ms]`,
						"hover:shadow-sm hover:scale-105"
					)}
				>
					<span className="mr-1.5">{statusIcons[status]}</span>
					{status.toLowerCase()}
				</Badge>
			)
		},
	},
	{
		id: 'actions',
		header: () => (
			<div className="text-center font-semibold text-gray-700 dark:text-gray-300" style={{ fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize }}>
				Actions
			</div>
		),
		cell: ({ row }) => <UnitActions unit={row.original} />,
		enableSorting: false,
	},
]