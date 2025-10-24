"use client"

import * as React from 'react'
import type { Property } from '@repo/shared/types/core'
import type { UpdatePropertyInput } from '@repo/shared/types/api-inputs'
import type { Database } from '@repo/shared/types/supabase-generated'

type PropertyType = Database['public']['Enums']['PropertyType']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	flexRender,
	type ColumnDef,
	type RowSelectionState,
	type SortingState
} from '@tanstack/react-table'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
	Ban,
	Check,
	ChevronDown,
	ChevronsUpDown,
	Filter,
	ListFilter,
	MoreHorizontal,
	Save,
	Settings2,
	SlidersHorizontal,
	X
} from 'lucide-react'
import { useUpdateProperty } from '@/hooks/api/use-properties'
import {
	selectColumnOrder,
	selectDraftById,
	selectEditingId,
	selectFacets,
	selectFilteredProperties,
	selectFilters,
	selectPageSize,
	selectTypeaheadSuggestions,
	usePropertiesViewStore
} from './properties-view.store'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'UNDER_CONTRACT', 'SOLD'] as const
const TYPE_OPTIONS = [
	'SINGLE_FAMILY',
	'MULTI_UNIT',
	'APARTMENT',
	'CONDO',
	'TOWNHOUSE',
	'COMMERCIAL',
	'OTHER'
] as const

type PropertiesTableClientProps = {
	data: Property[]
}

export function PropertiesTableClient({ data }: PropertiesTableClientProps) {
	const setProperties = usePropertiesViewStore(state => state.setProperties)
	React.useEffect(() => {
		setProperties(data)
	}, [data, setProperties])

	const filters = usePropertiesViewStore(selectFilters)
	const facets = usePropertiesViewStore(selectFacets)
	const filteredProperties = usePropertiesViewStore(selectFilteredProperties)
	const suggestions = usePropertiesViewStore(selectTypeaheadSuggestions)
	const columnOrder = usePropertiesViewStore(selectColumnOrder)
	const setColumnOrder = usePropertiesViewStore(state => state.setColumnOrder)
	const pageSize = usePropertiesViewStore(selectPageSize)
	const setPageSize = usePropertiesViewStore(state => state.setPageSize)
	const applyPropertyUpdate = usePropertiesViewStore(
		state => state.applyPropertyUpdate
	)
	const applyBulkStatusInStore = usePropertiesViewStore(
		state => state.applyBulkStatus
	)
	const setSearch = usePropertiesViewStore(state => state.setSearch)
	const clearSearch = usePropertiesViewStore(state => state.clearSearch)
	const toggleFacet = usePropertiesViewStore(state => state.toggleFacet)
	const clearFacet = usePropertiesViewStore(state => state.clearFacet)
	const clearFilters = usePropertiesViewStore(state => state.clearFilters)

	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [bulkStatus, setBulkStatus] = React.useState<
		typeof STATUS_OPTIONS[number]
	>('ACTIVE')
	const [isBulkUpdating, setIsBulkUpdating] = React.useState(false)

	const updatePropertyMutation = useUpdateProperty()

	const selectedIds = React.useMemo(
		() =>
			Object.entries(rowSelection)
				.filter(([, value]) => !!value)
				.map(([key]) => key),
		[rowSelection]
	)

	const handleInlineSave = React.useCallback(
		async (id: string, draft: Partial<UpdatePropertyInput>) => {
			try {
				const payload: UpdatePropertyInput = {
					...draft
				}

				const updated = await updatePropertyMutation.mutateAsync({
					id,
					data: payload
				})

				applyPropertyUpdate(id, updated)
				toast.success('Property updated')
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Failed to update property'
				toast.error(message)
			}
		},
		[applyPropertyUpdate, updatePropertyMutation]
	)

	const handleBulkUpdate = React.useCallback(async () => {
		if (!selectedIds.length) return
		setIsBulkUpdating(true)
		try {
			for (const id of selectedIds) {
				await updatePropertyMutation.mutateAsync({
					id,
					data: { status: bulkStatus }
				})
			}
			applyBulkStatusInStore(selectedIds, bulkStatus)
			toast.success(`Updated ${selectedIds.length} property status`)
			setRowSelection({})
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to update selected properties'
			toast.error(message)
		} finally {
			setIsBulkUpdating(false)
		}
	}, [
		applyBulkStatusInStore,
		bulkStatus,
		selectedIds,
		updatePropertyMutation
	])

	const columns = React.useMemo<ColumnDef<Property>[]>(() => {
		return [
			{
				id: 'select',
				size: 40,
				enableSorting: false,
				enableHiding: false,
				header: ({ table }) => (
					<div className="flex items-center justify-center">
						<Checkbox
							checked={table.getIsAllPageRowsSelected()}
							onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
							aria-label="Select all"
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="flex items-center justify-center">
						<Checkbox
							checked={row.getIsSelected()}
							onCheckedChange={value => row.toggleSelected(!!value)}
							aria-label="Select row"
						/>
					</div>
				)
			},
			{
				accessorKey: 'name',
				header: 'Name',
				cell: ({ row }) => <NameCell property={row.original} />
			},
			{
				id: 'location',
				header: 'Location',
				cell: ({ row }) => {
					const property = row.original
					return (
						<div className="text-sm text-muted-foreground">
							{[property.city, property.state, property.zipCode]
								.filter(Boolean)
								.join(', ')}
						</div>
					)
				}
			},
			{
				accessorKey: 'propertyType',
				header: 'Type',
				cell: ({ row }) => <TypeCell property={row.original} />
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) => <StatusCell property={row.original} />
			},
			{
				accessorKey: 'updatedAt',
				header: 'Updated',
				cell: ({ row }) => {
					const value = row.getValue('updatedAt') as string | null
					if (!value) {
						return <span className="text-muted-foreground">—</span>
					}
					return (
						<span className="text-muted-foreground">
							{new Date(value).toLocaleDateString()}
						</span>
					)
				}
			},
			{
				id: 'actions',
				enableHiding: false,
				cell: ({ row }) => (
					<ActionsCell
						property={row.original}
						onSave={handleInlineSave}
						isSaving={updatePropertyMutation.isPending}
					/>
				)
			}
		]
	}, [
		handleInlineSave,
		updatePropertyMutation.isPending
	])

	const computedColumnOrder = React.useMemo(
		() => ['select', ...columnOrder],
		[columnOrder]
	)

	const table = useReactTable({
		data: filteredProperties,
		columns,
		state: {
			sorting,
			rowSelection,
			columnOrder: computedColumnOrder,
			pagination: {
				pageIndex: 0,
				pageSize
			}
		},
		enableRowSelection: true,
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		onColumnOrderChange: updater => {
			const newOrder =
				typeof updater === 'function' ? updater(computedColumnOrder) : updater
			const sanitized = newOrder.filter(id => id !== 'select')
			setColumnOrder(sanitized)
		},
		onPaginationChange: updater => {
			const current = table.getState().pagination
			const next = typeof updater === 'function' ? updater(current) : updater
			if (next.pageSize !== current.pageSize) {
				setPageSize(next.pageSize)
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getRowId: row => row.id
	})

	return (
		<div className="space-y-4">
			<Toolbar
				search={filters.search}
				onSearchChange={setSearch}
				onClearSearch={clearSearch}
				suggestions={suggestions}
				filters={filters}
				facets={facets}
				onToggleFacet={toggleFacet}
				onClearFacet={clearFacet}
				onClearAllFilters={clearFilters}
				columnOrder={columnOrder}
				onReorderColumns={order => {
					setColumnOrder(order)
					table.setColumnOrder(['select', ...order])
				}}
				rowSelection={selectedIds}
				bulkStatus={bulkStatus}
				onBulkStatusChange={setBulkStatus}
				onBulkApply={handleBulkUpdate}
				isBulkUpdating={isBulkUpdating}
			/>
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No properties found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	)
}

type ToolbarProps = {
	search: string
	onSearchChange: (value: string) => void
	onClearSearch: () => void
	suggestions: string[]
	filters: ReturnType<typeof selectFilters>
	facets: ReturnType<typeof selectFacets>
	onToggleFacet: (key: 'cities' | 'statuses' | 'types', value: string) => void
	onClearFacet: (key: 'cities' | 'statuses' | 'types') => void
	onClearAllFilters: () => void
	columnOrder: string[]
	onReorderColumns: (order: string[]) => void
	rowSelection: string[]
	bulkStatus: typeof STATUS_OPTIONS[number]
	onBulkStatusChange: (value: typeof STATUS_OPTIONS[number]) => void
	onBulkApply: () => void
	isBulkUpdating: boolean
}

function Toolbar({
	search,
	onSearchChange,
	onClearSearch,
	suggestions,
	filters,
	facets,
	onToggleFacet,
	onClearFacet,
	onClearAllFilters,
	columnOrder,
	onReorderColumns,
	rowSelection,
	bulkStatus,
	onBulkStatusChange,
	onBulkApply,
	isBulkUpdating
}: ToolbarProps) {
	return (
		<div className="flex w-full flex-wrap items-center gap-3">
			<TypeaheadFilter
				value={search}
				onValueChange={onSearchChange}
				onClear={onClearSearch}
				suggestions={suggestions}
			/>
			<FacetFilter
				label="City"
				icon={Filter}
				options={facets.cities}
				selected={filters.cities}
				onToggle={value => onToggleFacet('cities', value)}
				onClear={() => onClearFacet('cities')}
			/>
			<FacetFilter
				label="Status"
				icon={ListFilter}
				options={facets.statuses.length ? facets.statuses : Array.from(STATUS_OPTIONS)}
				selected={filters.statuses}
				onToggle={value => onToggleFacet('statuses', value)}
				onClear={() => onClearFacet('statuses')}
			/>
			<FacetFilter
				label="Type"
				icon={Settings2}
				options={facets.types.length ? facets.types : Array.from(TYPE_OPTIONS)}
				selected={filters.types}
				onToggle={value => onToggleFacet('types', value)}
				onClear={() => onClearFacet('types')}
			/>
			{(filters.cities.length ||
				filters.statuses.length ||
				filters.types.length ||
				filters.search) && (
				<Button variant="ghost" size="sm" onClick={onClearAllFilters}>
					<X className="mr-1 size-4" />
					Clear filters
				</Button>
			)}
			<ColumnArrangeButton
				columnOrder={columnOrder}
				onReorderColumns={onReorderColumns}
			/>
			<div className="ml-auto flex items-center gap-2">
				<div className="flex items-center gap-2">
					<Select
						value={bulkStatus}
						onValueChange={value =>
							onBulkStatusChange(value as typeof STATUS_OPTIONS[number])
						}
					>
						<SelectTrigger className="h-8 w-[150px]">
							<SelectValue placeholder="Set status" />
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map(option => (
								<SelectItem key={option} value={option}>
									{option.replace(/_/g, ' ')}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						size="sm"
						variant="secondary"
						disabled={!rowSelection.length || isBulkUpdating}
						onClick={onBulkApply}
					>
						{isBulkUpdating ? (
							<>
								<Ban className="mr-1 size-4 animate-spin" />
								Applying...
							</>
						) : (
							<>
								<Check className="mr-1 size-4" />
								Apply to {rowSelection.length}
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	)
}

function TypeaheadFilter({
	value,
	onValueChange,
	onClear,
	suggestions
}: {
	value: string
	onValueChange: (value: string) => void
	onClear: () => void
	suggestions: string[]
}) {
	const [open, setOpen] = React.useState(false)
	const containerRef = React.useRef<HTMLDivElement | null>(null)

	React.useEffect(() => {
		function handleClick(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [])

	return (
		<div ref={containerRef} className="relative w-full max-w-xs">
			<Input
				value={value}
				onChange={event => {
					setOpen(true)
					onValueChange(event.target.value)
				}}
				onFocus={() => setOpen(true)}
				placeholder="Search properties..."
				className="pr-20"
			/>
			{value && (
				<Button
					variant="ghost"
					size="sm"
					className="absolute right-0 top-1/2 -translate-y-1/2"
					onClick={() => {
						onClear()
						setOpen(false)
					}}
				>
					<X className="size-4" />
				</Button>
			)}
			{open && suggestions.length > 0 && (
				<div className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border bg-popover shadow">
					<Command>
						<CommandList>
							<CommandGroup heading="Suggestions">
								{suggestions.map(suggestion => (
									<CommandItem
										key={suggestion}
										onSelect={() => {
											onValueChange(suggestion)
											setOpen(false)
										}}
									>
										{suggestion}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</div>
			)}
		</div>
	)
}

function FacetFilter({
	label,
	icon: Icon,
	options,
	selected,
	onToggle,
	onClear
}: {
	label: string
	icon: React.ComponentType<{ className?: string }>
	options: string[]
	selected: string[]
	onToggle: (value: string) => void
	onClear: () => void
}) {
	const [open, setOpen] = React.useState(false)
	const hasSelection = selected.length > 0

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						'flex items-center gap-1',
						hasSelection && 'border-primary text-primary'
					)}
				>
					<Icon className="size-4" />
					{label}
					{hasSelection ? (
						<Badge variant="secondary">{selected.length}</Badge>
					) : (
						<ChevronsUpDown className="size-3 opacity-50" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-60 p-0" align="start">
				<Command>
					<CommandInput placeholder={`Filter ${label.toLowerCase()}...`} />
					<CommandList>
						<CommandEmpty>No options found.</CommandEmpty>
						<CommandGroup>
							{options.map(option => {
								const isSelected = selected.includes(option)
								return (
									<CommandItem
										key={option}
										onSelect={() => onToggle(option)}
										className="flex items-center gap-2"
									>
										<Checkbox checked={isSelected} />
										<span>{option.replace(/_/g, ' ')}</span>
									</CommandItem>
								)
							})}
						</CommandGroup>
					</CommandList>
				</Command>
				<div className="flex items-center justify-between border-t px-3 py-2">
					<span className="text-xs text-muted-foreground">
						{selected.length
							? `${selected.length} selected`
							: 'No filters applied'}
					</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							onClear()
							setOpen(false)
						}}
					>
						Clear
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}

function NameCell({ property }: { property: Property }) {
	const editingId = usePropertiesViewStore(selectEditingId)
	const draft = usePropertiesViewStore(selectDraftById(property.id))
	const updateDraft = usePropertiesViewStore(state => state.updateDraft)

	if (editingId === property.id) {
		return (
			<Input
				value={draft.name ?? property.name ?? ''}
				onChange={event =>
					updateDraft(property.id, { name: event.target.value })
				}
				placeholder="Property name"
			/>
		)
	}

	return (
		<Link href={`/manage/properties/${property.id}`} className="hover:underline">
			<span className="font-medium">{property.name}</span>
		</Link>
	)
}

function TypeCell({ property }: { property: Property }) {
	const editingId = usePropertiesViewStore(selectEditingId)
	const draft = usePropertiesViewStore(selectDraftById(property.id))
	const updateDraft = usePropertiesViewStore(state => state.updateDraft)
	const facetTypes = usePropertiesViewStore(state => state.facets.types)
	const options = facetTypes.length ? facetTypes : Array.from(TYPE_OPTIONS)
	const value =
		draft.propertyType ??
		(property as Property & { propertyType?: string }).propertyType ??
		'UNKNOWN'

	if (editingId === property.id) {
		return (
			<Select
				value={value}
				onValueChange={selected =>
					updateDraft(property.id, { propertyType: selected as PropertyType })
				}
			>
				<SelectTrigger className="h-8 w-full">
					<SelectValue placeholder="Type" />
				</SelectTrigger>
				<SelectContent>
					{options.map(option => (
						<SelectItem key={option} value={option}>
							{option.replace(/_/g, ' ')}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
	}

	return (
		<Badge variant="outline">
			{(value || 'UNKNOWN').toString().replace(/_/g, ' ')}
		</Badge>
	)
}

function StatusCell({ property }: { property: Property }) {
	const editingId = usePropertiesViewStore(selectEditingId)
	const draft = usePropertiesViewStore(selectDraftById(property.id))
	const updateDraft = usePropertiesViewStore(state => state.updateDraft)
	const facetStatuses = usePropertiesViewStore(state => state.facets.statuses)
	const options = facetStatuses.length
		? facetStatuses
		: Array.from(STATUS_OPTIONS)
	const value =
		draft.status ??
		(property as Property & { status?: string }).status ??
		'UNKNOWN'

	if (editingId === property.id) {
		return (
			<Select
				value={value}
				onValueChange={selected =>
					updateDraft(property.id, { status: selected as PropertyStatus })
				}
			>
				<SelectTrigger className="h-8 w-full">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					{options.map(option => (
						<SelectItem key={option} value={option}>
							{option.replace(/_/g, ' ')}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
	}

	const variant =
		value === 'ACTIVE'
			? 'default'
			: value === 'SOLD'
				? 'secondary'
				: 'outline'

	return (
		<Badge variant={variant}>
			{(value || 'UNKNOWN').toString().replace(/_/g, ' ')}
		</Badge>
	)
}

function ActionsCell({
	property,
	onSave,
	isSaving
}: {
	property: Property
	onSave: (id: string, draft: Partial<UpdatePropertyInput>) => void
	isSaving: boolean
}) {
	const editingId = usePropertiesViewStore(selectEditingId)
	const draft = usePropertiesViewStore(selectDraftById(property.id))
	const startEditing = usePropertiesViewStore(state => state.startEditing)
	const cancelEditing = usePropertiesViewStore(state => state.cancelEditing)

	if (editingId === property.id) {
		return (
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					variant="default"
					onClick={() => onSave(property.id, draft)}
					disabled={isSaving}
				>
					<Save className="mr-1 size-4" />
					Save
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={cancelEditing}
					disabled={isSaving}
				>
					<X className="mr-1 size-4" />
					Cancel
				</Button>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<Button size="sm" variant="ghost" onClick={() => startEditing(property)}>
				<MoreHorizontal className="mr-1 size-4" />
				Inline edit
			</Button>
			<Button size="sm" variant="outline" asChild>
				<Link href={`/manage/properties/${property.id}`}>View</Link>
			</Button>
		</div>
	)
}

function ColumnArrangeButton({
	columnOrder,
	onReorderColumns
}: {
	columnOrder: string[]
	onReorderColumns: (order: string[]) => void
}) {
	const [open, setOpen] = React.useState(false)

	const moveColumn = React.useCallback(
		(index: number, direction: 'up' | 'down') => {
			const nextOrder = [...columnOrder]
			const targetIndex = direction === 'up' ? index - 1 : index + 1
			if (targetIndex < 0 || targetIndex >= nextOrder.length) return
			const [item] = nextOrder.splice(index, 1)
			if (item) nextOrder.splice(targetIndex, 0, item)
			onReorderColumns(nextOrder)
		},
		[columnOrder, onReorderColumns]
	)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm">
					<SlidersHorizontal className="mr-1 size-4" />
					Columns
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56">
				<p className="mb-2 text-sm font-medium">Column order</p>
				<div className="space-y-1">
					{columnOrder.map((columnId, index) => (
						<div
							key={columnId}
							className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
						>
							<span className="capitalize">{columnId}</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={() => moveColumn(index, 'up')}
									disabled={index === 0}
								>
									<ChevronDown className="size-4 rotate-180" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={() => moveColumn(index, 'down')}
									disabled={index === columnOrder.length - 1}
								>
									<ChevronDown className="size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
