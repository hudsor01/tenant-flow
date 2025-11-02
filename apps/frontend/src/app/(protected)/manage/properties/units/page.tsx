'use client'

import { ChartAreaInteractive } from '#components/dashboard/chart-area-interactive'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '#components/ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { unitColumns, type UnitRow } from './columns'
import { clientFetch } from '#lib/api/client'
import { useUnitList, useUnitStats, useCreateUnit } from '#hooks/api/use-unit'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DoorOpen, Filter, Plus } from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useRef } from 'react'
import { toast } from 'sonner'
import type { Property } from '@repo/shared/types/core'

type InsertUnit = Database['public']['Tables']['unit']['Insert']
type UnitStatus = Database['public']['Enums']['UnitStatus']

const ITEMS_PER_PAGE = 25

export default function UnitsPage() {
	// ✅ nuqs: Type-safe URL state with automatic batching and clean URLs
	const [{ page, status, property }, setUrlState] = useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			status: parseAsString.withDefault(''),
			property: parseAsString.withDefault('')
		},
		{
			history: 'push',
			scroll: false,
			shallow: true,
			throttleMs: 200,
			clearOnDefault: true // Clean URLs: /units instead of /units?page=1&status=&property=
		}
	)

	// Use modern hook with pagination
	const params: {
		status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
		propertyId?: string
		limit: number
		offset: number
	} = {
		limit: ITEMS_PER_PAGE,
		offset: (page - 1) * ITEMS_PER_PAGE
	}
	if (status) params.status = status as UnitStatus
	if (property) params.propertyId = property

	const { data: unitsData, isLoading } = useUnitList(params)

	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: () => clientFetch<Property[]>('/api/v1/properties')
	})

	// Use backend RPC functions for statistics - NO CLIENT-SIDE CALCULATIONS
	const { data: unitsStats } = useUnitStats()

	const units = unitsData?.data || []
	const totalItems = unitsData?.total || 0

	// Use backend statistics directly - trust the database calculations
	const totalUnits = unitsStats?.total ?? 0
	const occupiedCount = unitsStats?.occupied ?? 0
	const vacantCount = unitsStats?.vacant ?? 0
	const maintenanceCount = unitsStats?.maintenance ?? 0
	const occupancyRate = unitsStats?.occupancyRate ?? 0

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Units Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Total Units
						</h3>
						<div className="size-2 rounded-full bg-chart-4" />
					</div>
					<div className="text-2xl font-bold">{totalUnits}</div>
					<p className="text-xs text-muted-foreground mt-1">
						Across all properties
					</p>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Occupied
						</h3>
						<div className="size-2 rounded-full bg-chart-1" />
					</div>
					<div className="text-2xl font-bold">{occupiedCount}</div>
					<div className="text-xs mt-1 text-chart-1">
						{occupancyRate.toFixed(1)}% occupancy
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Vacant
						</h3>
						<div className="size-2 rounded-full bg-chart-7" />
					</div>
					<div className="text-2xl font-bold">{vacantCount}</div>
					<div className="text-xs mt-1 text-chart-7">Available now</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Maintenance
						</h3>
						<div className="size-2 rounded-full bg-chart-5" />
					</div>
					<div className="text-2xl font-bold">{maintenanceCount}</div>
					<div className="text-xs mt-1 text-chart-5">Needs attention</div>
				</div>
			</div>

			{/* Units Content */}
			<div className="px-4 lg:px-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gradient-authority mb-2">
						Unit Management
					</h1>
					<p className="text-muted-foreground">
						Manage individual units across all properties
					</p>
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Filters and Actions */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
						<div className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" />
							<Select
								value={status || 'ALL'}
								onValueChange={value =>
									setUrlState({
										status: value === 'ALL' ? '' : value,
										page: 1
									})
								}
							>
								<SelectTrigger className="w-40">
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All Status</SelectItem>
									<SelectItem value="OCCUPIED">Occupied</SelectItem>
									<SelectItem value="VACANT">Vacant</SelectItem>
									<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
									<SelectItem value="RESERVED">Reserved</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<Select
							value={property || 'ALL'}
							onValueChange={value =>
								setUrlState({ property: value === 'ALL' ? '' : value, page: 1 })
							}
						>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="Filter by property" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Properties</SelectItem>
								{properties.map((property) => (
									<SelectItem key={property.id} value={property.id}>
										{property.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<NewUnitButton />
				</div>

				{/* Units Table */}
				<UnitsTable
					data={units as UnitRow[]}
					columns={unitColumns}
					isLoading={isLoading}
				/>

				{/* Pagination */}
				{totalItems > ITEMS_PER_PAGE && (
					<div className="mt-4">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										page={page - 1}
										currentPage={page}
										onPageChange={(newPage: number) =>
											setUrlState({ page: newPage })
										}
										className={
											page === 1 ? 'pointer-events-none opacity-50' : ''
										}
									>
										Previous
									</PaginationPrevious>
								</PaginationItem>

								{Array.from(
									{ length: Math.ceil(totalItems / ITEMS_PER_PAGE) },
									(_, i) => i + 1
								)
									.filter(
										pageNum =>
											pageNum === 1 ||
											pageNum === Math.ceil(totalItems / ITEMS_PER_PAGE) ||
											(pageNum >= page - 1 && pageNum <= page + 1)
									)
									.map((pageNum, idx, arr) => (
										<PaginationItem key={pageNum}>
											{idx > 0 && arr[idx - 1] !== pageNum - 1 ? (
												<span className="px-2">...</span>
											) : null}
											<PaginationLink
												page={pageNum}
												currentPage={page}
												onPageChange={(newPage: number) =>
													setUrlState({ page: newPage })
												}
												isActive={page === pageNum}
											>
												{pageNum}
											</PaginationLink>
										</PaginationItem>
									))}

								<PaginationItem>
									<PaginationNext
										page={page + 1}
										currentPage={page}
										onPageChange={(newPage: number) => {
											if (page < Math.ceil(totalItems / ITEMS_PER_PAGE)) {
												setUrlState({ page: newPage })
											}
										}}
										className={
											page === Math.ceil(totalItems / ITEMS_PER_PAGE)
												? 'pointer-events-none opacity-50'
												: ''
										}
									>
										Next
									</PaginationNext>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</div>
		</div>
	)
}

function UnitsTable({
	data,
	columns,
	isLoading
}: {
	data: UnitRow[]
	columns: ColumnDef<UnitRow>[]
	isLoading?: boolean
}) {
	if (isLoading) {
		return (
			<div className="rounded-md border bg-card shadow-sm">
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow>
							{columns.map((col: ColumnDef<UnitRow>, index) => {
								const key =
									'accessorKey' in col
										? String(col.accessorKey)
										: (col.id ?? `col-${index}`)
								return <TableHead key={key} className="font-semibold" />
							})}
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								<p className="text-muted-foreground">Loading units...</p>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		)
	}

	return (
		<div className="rounded-md border bg-card shadow-sm">
			<Table>
				<TableHeader className="bg-muted/50">
					<TableRow>
						{columns.map((col: ColumnDef<UnitRow>, index) => {
							const key =
								'accessorKey' in col
									? String(col.accessorKey)
									: (col.id ?? `col-${index}`)
							const headerContent =
								typeof col.header === 'function'
									? col.header({ column: col } as Parameters<
											NonNullable<typeof col.header>
										>[0])
									: col.header
							return (
								<TableHead key={key} className="font-semibold">
									{headerContent ?? ''}
								</TableHead>
							)
						})}
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.length ? (
						data.map(row => (
							<TableRow key={row.id} className="hover:bg-muted/30">
								{columns.map((col: ColumnDef<UnitRow>, index) => {
									const key =
										'accessorKey' in col
											? String(col.accessorKey)
											: (col.id ?? `col-${index}`)
									const value =
										'accessorKey' in col
											? (row as Record<string, unknown>)[
													col.accessorKey as string
												]
											: undefined
									const cellContent =
										col.cell && typeof col.cell === 'function'
											? col.cell({ row: { original: row } } as Parameters<
													NonNullable<typeof col.cell>
												>[0])
											: col.cell || value
									return <TableCell key={key}>{cellContent}</TableCell>
								})}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								<div className="flex flex-col items-center gap-2">
									<DoorOpen className="size-12 text-muted-foreground/50" />
									<p className="text-muted-foreground">No units found.</p>
									<NewUnitButton />
								</div>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	)
}

function NewUnitButton() {
	const qc = useQueryClient()
	const { data: properties = [] } = useQuery({
		queryKey: ['properties'],
		queryFn: () => clientFetch<Property[]>('/api/v1/properties')
	})

	const create = useCreateUnit()

	const closeButtonRef = useRef<HTMLButtonElement>(null)

	async function onSubmit(form: HTMLFormElement) {
		try {
			const fd = new FormData(form)
			await create.mutateAsync({
				unitNumber: String(fd.get('unitNumber') || ''),
				bedrooms: Number(fd.get('bedrooms') || 0),
				bathrooms: Number(fd.get('bathrooms') || 0),
				rent: Number(fd.get('rent') || 0),
				propertyId: String(fd.get('propertyId') || ''),
				status: 'VACANT'
			} as InsertUnit)
			qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
			toast.success('Unit created successfully')
			closeButtonRef.current?.click()
		} catch (error) {
			toast.error('Failed to create unit', {
				description: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="flex items-center gap-2 bg-chart-7 hover:bg-chart-7/90">
					<Plus className="size-4" />
					Add Unit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-gradient-authority">
						Add New Unit
					</DialogTitle>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={e => {
						e.preventDefault()
						onSubmit(e.target as HTMLFormElement)
					}}
				>
					<div className="grid grid-cols-2 gap-2">
						<div className="grid gap-2">
							<Label htmlFor="unitNumber">Unit Number</Label>
							<Input
								name="unitNumber"
								id="unitNumber"
								required
								placeholder="101"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="propertyId">Property</Label>
							<Select name="propertyId" required>
								<SelectTrigger>
									<SelectValue placeholder="Select property" />
								</SelectTrigger>
								<SelectContent>
									{properties.map((property) => (
										<SelectItem key={property.id} value={property.id}>
											{property.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div className="grid gap-2">
							<Label htmlFor="bedrooms">Bedrooms</Label>
							<Input
								name="bedrooms"
								id="bedrooms"
								type="number"
								min="0"
								placeholder="2"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="bathrooms">Bathrooms</Label>
							<Input
								name="bathrooms"
								id="bathrooms"
								type="number"
								min="0"
								step="0.5"
								placeholder="1.5"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="rent">Monthly Rent</Label>
							<Input
								name="rent"
								id="rent"
								type="number"
								min="0"
								placeholder="1200"
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button ref={closeButtonRef} type="button" variant="outline">
							Cancel
						</Button>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? 'Creating...' : 'Add Unit'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
