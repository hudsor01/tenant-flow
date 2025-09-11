'use client'

import type { Property } from '@repo/shared'
import type {
	ColumnDef,
	ColumnFiltersState,
	Row,
	SortingState,
	VisibilityState
} from '@tanstack/react-table'
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import {
	ArrowUpDown,
	BarChart3,
	Building2,
	CheckCircle,
	ChevronDown,
	Columns3,
	Copy,
	Download,
	Edit3,
	Eye,
	Filter,
	Loader,
	MoreVertical,
	Plus,
	Search,
	Star,
	Trash2,
	TrendingUp,
	Users
} from 'lucide-react'
import * as React from 'react'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { ANIMATION_DURATIONS, TYPOGRAPHY_SCALE } from '@/lib/design-system'
import { buttonClasses, cardClasses, cn, inputClasses } from '@/lib/utils'

// Enhanced schema with proper property management types
export const propertyTableSchema = z.object({
	id: z.number(),
	name: z.string(),
	type: z.enum(['apartment', 'house', 'condo', 'townhouse', 'commercial']),
	status: z.enum(['active', 'maintenance', 'vacant', 'leased']),
	occupiedUnits: z.number(),
	totalUnits: z.number(),
	revenue: z.number(),
	manager: z.string(),
	location: z.string(),
	lastUpdated: z.string()
})

type PropertyTableData = z.infer<typeof propertyTableSchema>

// Enhanced status badge component with proper styling
const StatusBadge: React.FC<{ status: PropertyTableData['status'] }> = ({
	status
}) => {
	const statusConfig = {
		active: {
			variant: 'default' as const,
			icon: CheckCircle,
			className:
				'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
			label: 'Active'
		},
		maintenance: {
			variant: 'secondary' as const,
			icon: Loader,
			className:
				'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
			label: 'Maintenance'
		},
		vacant: {
			variant: 'outline' as const,
			icon: Building2,
			className:
				'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
			label: 'Vacant'
		},
		leased: {
			variant: 'default' as const,
			icon: Users,
			className:
				'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
			label: 'Leased'
		}
	}

	const config = statusConfig[status]
	const IconComponent = config.icon

	return (
		<Badge
			variant={config.variant}
			className={cn(
				'flex items-center gap-1.5 px-2.5 py-1 font-medium transition-colors',
				config.className
			)}
		>
			<IconComponent className="h-3 w-3" />
			{config.label}
		</Badge>
	)
}

// Enhanced property type badge
const PropertyTypeBadge: React.FC<{ type: PropertyTableData['type'] }> = ({
	type
}) => {
	const typeConfig = {
		apartment: {
			icon: Building2,
			label: 'Apartment',
			color:
				'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
		},
		house: {
			icon: Building2,
			label: 'House',
			color:
				'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
		},
		condo: {
			icon: Building2,
			label: 'Condo',
			color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
		},
		townhouse: {
			icon: Building2,
			label: 'Townhouse',
			color:
				'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
		},
		commercial: {
			icon: BarChart3,
			label: 'Commercial',
			color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
		}
	}

	const config = typeConfig[type]
	const IconComponent = config.icon

	return (
		<Badge
			variant="outline"
			className={cn(
				'flex items-center gap-1.5 px-2.5 py-1 font-medium',
				config.color
			)}
		>
			<IconComponent className="h-3 w-3" />
			{config.label}
		</Badge>
	)
}

// Enhanced columns with professional design
const columns: ColumnDef<PropertyTableData>[] = [
	{
		id: 'select',
		header: ({ table }) => (
			<div className="flex items-center justify-center px-2">
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all properties"
					className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
				/>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-center px-2">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={value => row.toggleSelected(!!value)}
					aria-label={`Select property ${row.original.name}`}
					className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
		size: 50
	},
	{
		accessorKey: 'name',
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className={cn(
						buttonClasses('ghost', 'sm'),
						'justify-start gap-1 font-semibold hover:bg-muted/50'
					)}
					style={TYPOGRAPHY_SCALE['body-md']}
				>
					<Building2 className="h-4 w-4" />
					Property Name
					<ArrowUpDown
						className={cn(
							'h-3.5 w-3.5 transition-transform',
							column.getIsSorted() === 'asc' ? 'rotate-180' : '',
							column.getIsSorted() === 'desc' ? 'rotate-0' : 'opacity-50'
						)}
						style={{ transitionDuration: ANIMATION_DURATIONS.fast }}
					/>
				</Button>
			)
		},
		cell: ({ row }) => (
			<div className="flex flex-col gap-1 py-2">
				<div
					className="font-semibold text-foreground leading-tight"
					style={TYPOGRAPHY_SCALE['body-md']}
				>
					{row.getValue('name')}
				</div>
				<div
					className="text-muted-foreground text-xs leading-tight"
					style={TYPOGRAPHY_SCALE['body-xs']}
				>
					{row.original.location}
				</div>
			</div>
		),
		enableHiding: false,
		size: 200
	},
	{
		accessorKey: 'type',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className={cn(buttonClasses('ghost', 'sm'), 'gap-1')}
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				Type
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="flex justify-start">
				<PropertyTypeBadge type={row.original.type} />
			</div>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		size: 140
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className={cn(buttonClasses('ghost', 'sm'), 'gap-1')}
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				Status
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="flex justify-start">
				<StatusBadge status={row.original.status} />
			</div>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		size: 120
	},
	{
		id: 'occupancy',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className={cn(buttonClasses('ghost', 'sm'), 'justify-center gap-1')}
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				<Users className="h-4 w-4" />
				Occupancy
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		accessorFn: row => (row.occupiedUnits / row.totalUnits) * 100,
		cell: ({ row }) => {
			const occupiedUnits = row.original.occupiedUnits
			const totalUnits = row.original.totalUnits
			const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100)

			return (
				<div className="flex flex-col items-center gap-1 py-2">
					<div className="font-semibold" style={TYPOGRAPHY_SCALE['body-md']}>
						{occupiedUnits}/{totalUnits}
					</div>
					<div className="flex items-center gap-1">
						<div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
							<div
								className={cn(
									'h-full transition-all rounded-full',
									occupancyRate >= 90
										? 'bg-green-500'
										: occupancyRate >= 70
											? 'bg-blue-500'
											: occupancyRate >= 50
												? 'bg-yellow-500'
												: 'bg-red-500'
								)}
								style={{
									width: `${occupancyRate}%`,
									transitionDuration: ANIMATION_DURATIONS.medium
								}}
							/>
						</div>
						<span
							className="text-xs font-medium text-muted-foreground"
							style={TYPOGRAPHY_SCALE['body-xs']}
						>
							{occupancyRate}%
						</span>
					</div>
				</div>
			)
		},
		sortingFn: (rowA, rowB) => {
			const occupancyA =
				(rowA.original.occupiedUnits / rowA.original.totalUnits) * 100
			const occupancyB =
				(rowB.original.occupiedUnits / rowB.original.totalUnits) * 100
			return occupancyA - occupancyB
		},
		size: 120
	},
	{
		accessorKey: 'revenue',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className={cn(buttonClasses('ghost', 'sm'), 'justify-end gap-1')}
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				<TrendingUp className="h-4 w-4" />
				Monthly Revenue
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => {
			const revenue = row.original.revenue
			const formatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}).format(revenue)

			return (
				<div className="text-right py-2">
					<div
						className="font-semibold text-foreground"
						style={TYPOGRAPHY_SCALE['body-md']}
					>
						{formatted}
					</div>
					<div
						className="text-xs text-muted-foreground"
						style={TYPOGRAPHY_SCALE['body-xs']}
					>
						per month
					</div>
				</div>
			)
		},
		size: 140
	},
	{
		accessorKey: 'manager',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className={cn(buttonClasses('ghost', 'sm'), 'gap-1')}
				style={TYPOGRAPHY_SCALE['body-md']}
			>
				Manager
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="font-medium" style={TYPOGRAPHY_SCALE['body-md']}>
				{row.getValue('manager')}
			</div>
		),
		size: 150
	},
	{
		id: 'actions',
		header: () => (
			<div className="text-center">
				<span
					className="font-semibold text-muted-foreground"
					style={TYPOGRAPHY_SCALE['body-md']}
				>
					Actions
				</span>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className={cn(
								buttonClasses('ghost', 'sm'),
								'data-[state=open]:bg-muted text-muted-foreground hover:text-foreground h-8 w-8 p-0'
							)}
						>
							<MoreVertical className="h-4 w-4" />
							<span className="sr-only">
								Open actions menu for {row.original.name}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuItem
							className="gap-2"
							onClick={() => handleRowAction(row, 'view')}
						>
							<Eye className="h-4 w-4" />
							View Details
						</DropdownMenuItem>
						<DropdownMenuItem
							className="gap-2"
							onClick={() => handleRowAction(row, 'edit')}
						>
							<Edit3 className="h-4 w-4" />
							Edit Property
						</DropdownMenuItem>
						<DropdownMenuItem className="gap-2">
							<Copy className="h-4 w-4" />
							Duplicate
						</DropdownMenuItem>
						<DropdownMenuItem className="gap-2">
							<Star className="h-4 w-4" />
							Mark as Favorite
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="gap-2 text-destructive focus:text-destructive"
							onClick={() => handleRowAction(row, 'delete')}
						>
							<Trash2 className="h-4 w-4" />
							Delete Property
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
		size: 80
	}
]

// Row action handler that uses the Row type
import logger from '@repo/shared/lib/frontend-logger'

const handleRowAction = (
	row: Row<PropertyTableData>,
	action: 'edit' | 'delete' | 'view'
) => {
	const property = row.original

	switch (action) {
		case 'edit':
			logger.info({ property }, 'Editing property')
			break
		case 'delete':
			logger.info({ property }, 'Deleting property')
			break
		case 'view':
			logger.info({ property }, 'Viewing property')
			break
	}
}

interface DataTableProps extends React.ComponentProps<'div'> {
	data: PropertyTableData[]
	isLoading?: boolean
	error?: string
	onPropertyAdd?: () => void
	onPropertyEdit?: (property: PropertyTableData) => void
	onPropertyDelete?: (property: PropertyTableData) => void
	propertyData?: Property[] // Optional property data for analytics
}

// Advanced filter components
const StatusFilter: React.FC<{
	table: ReturnType<typeof useReactTable<PropertyTableData>>
}> = ({ table }) => {
	const statuses = ['active', 'maintenance', 'vacant', 'leased'] as const
	const selectedStatuses =
		(table.getColumn('status')?.getFilterValue() as string[]) ?? []

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						buttonClasses('outline', 'sm'),
						'border-dashed h-8 gap-1'
					)}
				>
					<Filter className="h-4 w-4" />
					Status
					{selectedStatuses.length > 0 && (
						<Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
							{selectedStatuses.length}
						</Badge>
					)}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				{statuses.map(status => (
					<DropdownMenuCheckboxItem
						key={status}
						className="capitalize gap-2"
						checked={selectedStatuses.includes(status)}
						onCheckedChange={checked => {
							if (checked) {
								table
									.getColumn('status')
									?.setFilterValue([...selectedStatuses, status])
							} else {
								table
									.getColumn('status')
									?.setFilterValue(selectedStatuses.filter(s => s !== status))
							}
						}}
					>
						<StatusBadge status={status} />
					</DropdownMenuCheckboxItem>
				))}
				{selectedStatuses.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => table.getColumn('status')?.setFilterValue([])}
							className="justify-center text-center"
						>
							Clear filters
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const TypeFilter: React.FC<{
	table: ReturnType<typeof useReactTable<PropertyTableData>>
}> = ({ table }) => {
	const types = [
		'apartment',
		'house',
		'condo',
		'townhouse',
		'commercial'
	] as const
	const selectedTypes =
		(table.getColumn('type')?.getFilterValue() as string[]) ?? []

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						buttonClasses('outline', 'sm'),
						'border-dashed h-8 gap-1'
					)}
				>
					<Building2 className="h-4 w-4" />
					Type
					{selectedTypes.length > 0 && (
						<Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
							{selectedTypes.length}
						</Badge>
					)}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				{types.map(type => (
					<DropdownMenuCheckboxItem
						key={type}
						className="capitalize gap-2"
						checked={selectedTypes.includes(type)}
						onCheckedChange={checked => {
							if (checked) {
								table
									.getColumn('type')
									?.setFilterValue([...selectedTypes, type])
							} else {
								table
									.getColumn('type')
									?.setFilterValue(selectedTypes.filter(t => t !== type))
							}
						}}
					>
						<PropertyTypeBadge type={type} />
					</DropdownMenuCheckboxItem>
				))}
				{selectedTypes.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => table.getColumn('type')?.setFilterValue([])}
							className="justify-center text-center"
						>
							Clear filters
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
	({ data, isLoading, error, onPropertyAdd, className, ...props }, ref) => {
		const [rowSelection, setRowSelection] = React.useState({})
		const [columnVisibility, setColumnVisibility] =
			React.useState<VisibilityState>({})
		const [columnFilters, setColumnFilters] =
			React.useState<ColumnFiltersState>([])
		const [sorting, setSorting] = React.useState<SortingState>([
			{ id: 'name', desc: false }
		])
		const [globalFilter, setGlobalFilter] = React.useState('')
		const [pagination, setPagination] = React.useState({
			pageIndex: 0,
			pageSize: 15
		})

		const table = useReactTable({
			data,
			columns,
			state: {
				sorting,
				columnVisibility,
				rowSelection,
				columnFilters,
				pagination,
				globalFilter
			},
			getRowId: row => row.id.toString(),
			enableRowSelection: true,
			enableGlobalFilter: true,
			globalFilterFn: 'includesString',
			onRowSelectionChange: setRowSelection,
			onSortingChange: setSorting,
			onColumnFiltersChange: setColumnFilters,
			onColumnVisibilityChange: setColumnVisibility,
			onPaginationChange: setPagination,
			onGlobalFilterChange: setGlobalFilter,
			getCoreRowModel: getCoreRowModel(),
			getFilteredRowModel: getFilteredRowModel(),
			getPaginationRowModel: getPaginationRowModel(),
			getSortedRowModel: getSortedRowModel(),
			getExpandedRowModel: getExpandedRowModel(),
			getFacetedRowModel: getFacetedRowModel(),
			getFacetedUniqueValues: getFacetedUniqueValues()
		})

		// Calculate summary statistics
		const filteredData = table
			.getFilteredRowModel()
			.rows.map(row => row.original)
		const totalProperties = filteredData.length
		const totalUnits = filteredData.reduce(
			(sum, prop) => sum + prop.totalUnits,
			0
		)
		const totalOccupied = filteredData.reduce(
			(sum, prop) => sum + prop.occupiedUnits,
			0
		)
		const totalRevenue = filteredData.reduce(
			(sum, prop) => sum + prop.revenue,
			0
		)
		const avgOccupancy =
			totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

		// Handle loading and error states
		if (error) {
			return (
				<div
					ref={ref}
					className={cn(cardClasses('elevated'), 'p-8 text-center', className)}
					{...props}
				>
					<div className="flex flex-col items-center gap-4">
						<div className="rounded-full bg-destructive/10 p-3">
							<MoreVertical className="h-6 w-6 text-destructive" />
						</div>
						<div>
							<h3
								className="font-semibold text-destructive mb-2"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Error Loading Properties
							</h3>
							<p
								className="text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-md']}
							>
								{error}
							</p>
						</div>
					</div>
				</div>
			)
		}

		return (
			<div ref={ref} className={cn('w-full space-y-6', className)} {...props}>
				{/* Summary Statistics */}
				<div className={cn(cardClasses('elevated'), 'p-6')}>
					<div
						className="text-lg font-semibold mb-4"
						style={TYPOGRAPHY_SCALE['heading-sm']}
					>
						Portfolio Overview
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div className="text-center">
							<div
								className="text-2xl font-bold text-primary mb-1"
								style={TYPOGRAPHY_SCALE['heading-lg']}
							>
								{totalProperties}
							</div>
							<div
								className="text-sm text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								Properties
							</div>
						</div>
						<div className="text-center">
							<div
								className="text-2xl font-bold text-primary mb-1"
								style={TYPOGRAPHY_SCALE['heading-lg']}
							>
								{totalOccupied}/{totalUnits}
							</div>
							<div
								className="text-sm text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								Units Occupied
							</div>
						</div>
						<div className="text-center">
							<div
								className="text-2xl font-bold text-primary mb-1"
								style={TYPOGRAPHY_SCALE['heading-lg']}
							>
								{avgOccupancy}%
							</div>
							<div
								className="text-sm text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								Avg Occupancy
							</div>
						</div>
						<div className="text-center">
							<div
								className="text-2xl font-bold text-primary mb-1"
								style={TYPOGRAPHY_SCALE['heading-lg']}
							>
								{new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: 'USD',
									notation: 'compact',
									maximumFractionDigits: 1
								}).format(totalRevenue)}
							</div>
							<div
								className="text-sm text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-xs']}
							>
								Monthly Revenue
							</div>
						</div>
					</div>
				</div>

				{/* Search and Filters */}
				<div className={cn(cardClasses('default'), 'p-4')}>
					<div className="flex flex-col gap-4">
						{/* Search Bar */}
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search by name, location, or manager..."
									value={globalFilter ?? ''}
									onChange={event =>
										setGlobalFilter(String(event.target.value))
									}
									className={cn(
										inputClasses('default', 'default'),
										'pl-10 h-10'
									)}
									style={TYPOGRAPHY_SCALE['body-md']}
								/>
							</div>
						</div>

						{/* Filter Controls */}
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<StatusFilter table={table} />
								<TypeFilter table={table} />

								{/* Clear All Filters */}
								{(columnFilters.length > 0 || globalFilter) && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setColumnFilters([])
											setGlobalFilter('')
										}}
										className={cn(
											buttonClasses('ghost', 'sm'),
											'h-8 px-2 lg:px-3 text-xs'
										)}
									>
										Reset
									</Button>
								)}
							</div>

							<div className="flex items-center gap-2">
								{/* Column Visibility */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className={cn(
												buttonClasses('outline', 'sm'),
												'h-8 gap-1'
											)}
										>
											<Columns3 className="h-4 w-4" />
											Columns
											<ChevronDown className="h-3 w-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										{table
											.getAllColumns()
											.filter(
												column =>
													typeof column.accessorFn !== 'undefined' &&
													column.getCanHide()
											)
											.map(column => {
												return (
													<DropdownMenuCheckboxItem
														key={column.id}
														className="capitalize"
														checked={column.getIsVisible()}
														onCheckedChange={value =>
															column.toggleVisibility(!!value)
														}
													>
														{column.id === 'name'
															? 'Property Name'
															: column.id === 'occupancy'
																? 'Occupancy Rate'
																: column.id === 'revenue'
																	? 'Monthly Revenue'
																	: column.id}
													</DropdownMenuCheckboxItem>
												)
											})}
									</DropdownMenuContent>
								</DropdownMenu>

								{/* Export */}
								<Button
									variant="outline"
									size="sm"
									className={cn(buttonClasses('outline', 'sm'), 'h-8 gap-1')}
								>
									<Download className="h-4 w-4" />
									Export
								</Button>

								{/* Add Property */}
								<Button
									size="sm"
									onClick={onPropertyAdd}
									className={cn(
										buttonClasses('primary', 'sm'),
										'h-8 gap-1 bg-primary hover:bg-primary/90'
									)}
								>
									<Plus className="h-4 w-4" />
									Add Property
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className={cn(cardClasses('default'), 'overflow-hidden')}>
					<Table>
						<TableHeader className="bg-muted/50">
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow
									key={headerGroup.id}
									className="hover:bg-transparent border-b"
								>
									{headerGroup.headers.map(header => {
										return (
											<TableHead
												key={header.id}
												colSpan={header.colSpan}
												className="font-semibold h-12"
												style={{
													width:
														header.getSize() !== 150
															? header.getSize()
															: undefined,
													...TYPOGRAPHY_SCALE['body-md']
												}}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
											</TableHead>
										)
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{isLoading ? (
								// Loading skeleton rows
								[...Array(5)].map((_, i) => (
									<TableRow key={i}>
										{columns.map((_, j) => (
											<TableCell key={j} className="h-16">
												<div className="animate-pulse bg-muted rounded h-4 w-full max-w-[120px]" />
											</TableCell>
										))}
									</TableRow>
								))
							) : table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map(row => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className={cn(
											'hover:bg-muted/50 transition-colors',
											row.getIsSelected() && 'bg-muted'
										)}
										style={{ transitionDuration: ANIMATION_DURATIONS.fast }}
									>
										{row.getVisibleCells().map(cell => (
											<TableCell
												key={cell.id}
												className="px-4 py-3"
												style={{
													width:
														cell.column.getSize() !== 150
															? cell.column.getSize()
															: undefined
												}}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-32 text-center"
									>
										<div className="flex flex-col items-center justify-center gap-3">
											<Building2 className="h-8 w-8 text-muted-foreground" />
											<div>
												<p
													className="font-semibold text-foreground mb-1"
													style={TYPOGRAPHY_SCALE['body-md']}
												>
													No properties found
												</p>
												<p
													className="text-sm text-muted-foreground"
													style={TYPOGRAPHY_SCALE['body-xs']}
												>
													{globalFilter || columnFilters.length > 0
														? 'Try adjusting your search or filters'
														: 'Get started by adding your first property'}
												</p>
											</div>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination and Selection */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div
							className="text-sm text-muted-foreground"
							style={TYPOGRAPHY_SCALE['body-xs']}
						>
							{table.getFilteredSelectedRowModel().rows.length > 0 && (
								<span>
									{table.getFilteredSelectedRowModel().rows.length} of{' '}
									{table.getFilteredRowModel().rows.length} row(s) selected
								</span>
							)}
						</div>

						{table.getFilteredSelectedRowModel().rows.length > 0 && (
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									className={cn(buttonClasses('outline', 'sm'), 'h-8')}
								>
									<Download className="h-4 w-4 mr-1" />
									Export Selected
								</Button>
								<Button
									variant="outline"
									size="sm"
									className={cn(
										buttonClasses('outline', 'sm'),
										'h-8 text-destructive hover:text-destructive'
									)}
								>
									<Trash2 className="h-4 w-4 mr-1" />
									Delete Selected
								</Button>
							</div>
						)}
					</div>

					<div className="flex items-center gap-6">
						<div
							className="text-sm text-muted-foreground"
							style={TYPOGRAPHY_SCALE['body-xs']}
						>
							Showing{' '}
							{table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
								1}{' '}
							to{' '}
							{Math.min(
								(table.getState().pagination.pageIndex + 1) *
									table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length
							)}{' '}
							of {table.getFilteredRowModel().rows.length} properties
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
								className={cn(buttonClasses('outline', 'sm'), 'h-8')}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
								className={cn(buttonClasses('outline', 'sm'), 'h-8')}
							>
								Next
							</Button>
						</div>
					</div>
				</div>
			</div>
		)
	}
)
DataTable.displayName = 'DataTable'
