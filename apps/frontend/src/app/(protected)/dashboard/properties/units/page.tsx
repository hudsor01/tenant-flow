'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { type UnitRow, unitColumns } from '@/components/units/units-columns'
import { useProperties } from '@/hooks/api/properties'
import { useCreateUnit, useUnits } from '@/hooks/api/units'
import type { Database } from '@repo/shared'
import type { ColumnDef } from '@tanstack/react-table'
import { DoorOpen, Filter, Plus } from 'lucide-react'

type InsertUnit = Database['public']['Tables']['Unit']['Insert']
type UnitStatus = Database['public']['Enums']['UnitStatus']

export default function UnitsPage({
	searchParams
}: {
	searchParams?: { status?: string; property?: string }
}) {
	const status = searchParams?.status as UnitStatus | undefined
	const propertyFilter = searchParams?.property

	const { data: units = [] } = useUnits(status)
	const { data: properties = [] } = useProperties()

	// Filter units by property if specified
	const filteredUnits = propertyFilter
		? units.filter(unit => unit.propertyId === propertyFilter)
		: units

	// Get occupancy stats
	const occupiedUnits = filteredUnits.filter(unit => unit.status === 'OCCUPIED')
	const vacantUnits = filteredUnits.filter(unit => unit.status === 'VACANT')
	const _maintenanceUnits = filteredUnits.filter(
		unit => unit.status === 'MAINTENANCE'
	)
	const occupancyRate =
		filteredUnits.length > 0
			? (occupiedUnits.length / filteredUnits.length) * 100
			: 0
	const avgRent =
		filteredUnits.length > 0
			? filteredUnits.reduce((sum, unit) => sum + (unit.rent || 0), 0) /
				filteredUnits.length
			: 0

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Units Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Total Units
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-4)' }}
						/>
					</div>
					<div className="text-2xl font-bold">{filteredUnits.length}</div>
					<p className="text-xs text-muted-foreground mt-1">
						Across all properties
					</p>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Occupied
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-1)' }}
						/>
					</div>
					<div className="text-2xl font-bold">{occupiedUnits.length}</div>
					<div className="text-xs mt-1" style={{ color: 'var(--chart-1)' }}>
						{occupancyRate.toFixed(1)}% occupancy
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Vacant
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-7)' }}
						/>
					</div>
					<div className="text-2xl font-bold">{vacantUnits.length}</div>
					<div className="text-xs mt-1" style={{ color: 'var(--chart-7)' }}>
						Available now
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Avg Monthly Rent
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-3)' }}
						/>
					</div>
					<div
						className="text-2xl font-bold"
						style={{ color: 'var(--chart-3)' }}
					>
						{new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
							maximumFractionDigits: 0
						}).format(avgRent)}
					</div>
					<div className="text-xs mt-1 text-muted-foreground">
						Per unit average
					</div>
				</div>
			</div>

			{/* Units Content */}
			<div className="px-4 lg:px-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gradient-energy mb-2">
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
							<Select defaultValue={status ?? 'ALL'}>
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

						<Select defaultValue={propertyFilter ?? 'ALL'}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="Filter by property" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Properties</SelectItem>
								{properties.map(property => (
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
				<UnitsTable data={filteredUnits as UnitRow[]} columns={unitColumns} />
			</div>
		</div>
	)
}

function UnitsTable({
	data,
	columns
}: {
	data: UnitRow[]
	columns: ColumnDef<UnitRow>[]
}) {
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
	const create = useCreateUnit()
	const { data: properties = [] } = useProperties()

	async function onSubmit(form: HTMLFormElement) {
		const fd = new FormData(form)
		await create.mutateAsync({
			unitNumber: String(fd.get('unitNumber') || ''),
			bedrooms: Number(fd.get('bedrooms') || 0),
			bathrooms: Number(fd.get('bathrooms') || 0),
			rent: Number(fd.get('rent') || 0),
			propertyId: String(fd.get('propertyId') || ''),
			status: 'VACANT'
		} as InsertUnit)
		;(document.getElementById('new-unit-close') as HTMLButtonElement)?.click()
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					className="flex items-center gap-2"
					style={{ backgroundColor: 'var(--chart-7)' }}
				>
					<Plus className="size-4" />
					Add Unit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-gradient-energy">
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
									{properties.map(property => (
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
						<Button id="new-unit-close" type="button" variant="outline">
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
