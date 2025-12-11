'use client'

import dynamic from 'next/dynamic'
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { unitColumns, type UnitRow } from './columns'
import { useCreateUnitMutation } from '#hooks/api/mutations/unit-mutations'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'
import type { UnitInput } from '@repo/shared/validation/units'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { DoorOpen, Plus } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'

// Dynamic import: ChartAreaInteractive is heavy (~40KB), defer loading until needed
const ChartAreaInteractive = dynamic(
	() =>
		import('#components/dashboard/chart-area-interactive').then(
			mod => mod.ChartAreaInteractive
		),
	{
		loading: () => (
			<div className="h-[300px] rounded-lg border bg-card shadow-sm animate-pulse" />
		),
		ssr: false // Chart renders client-side only
	}
)

export default function UnitsPage() {
	// Use modern hook with pagination
	const { data: unitsResponse, isLoading } = useQuery(unitQueries.list({
		limit: 100,
		offset: 0
	}))

	const { data: propertiesResponse } = useQuery(propertyQueries.list())

	// Use backend RPC functions for statistics - NO CLIENT-SIDE CALCULATIONS
	const { data: unitsStats } = useQuery(unitQueries.stats())

	const units = (unitsResponse?.data || []) as UnitRow[]
	const properties = propertiesResponse?.data || []

	// Use backend statistics directly - trust the database calculations
	const totalUnits = unitsStats?.total ?? 0
	const occupiedCount = unitsStats?.occupied ?? 0
	const vacantCount = unitsStats?.vacant ?? 0
	const maintenanceCount = unitsStats?.maintenance ?? 0
	const occupancyRate = unitsStats?.occupancyRate ?? 0

	// Setup TanStack Table with DiceUI DataTable
	const table = useReactTable({
		data: units,
		columns: unitColumns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		initialState: {
			pagination: {
				pageSize: 25,
			},
		},
	})

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Units Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex-between mb-2">
						<h3 className="text-muted font-medium">
							Total Units
						</h3>
						<div className="size-2 rounded-full bg-chart-4" />
					</div>
					<div className="typography-h3">{totalUnits}</div>
					<p className="text-caption mt-1">
						Across all properties
					</p>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex-between mb-2">
						<h3 className="text-muted font-medium">
							Occupied
						</h3>
						<div className="size-2 rounded-full bg-chart-1" />
					</div>
					<div className="typography-h3">{occupiedCount}</div>
					<div className="text-xs mt-1 text-chart-1">
						{occupancyRate.toFixed(1)}% occupancy
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex-between mb-2">
						<h3 className="text-muted font-medium">
							Vacant
						</h3>
						<div className="size-2 rounded-full bg-chart-7" />
					</div>
					<div className="typography-h3">{vacantCount}</div>
					<div className="text-xs mt-1 text-chart-7">Available now</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex-between mb-2">
						<h3 className="text-muted font-medium">
							Maintenance
						</h3>
						<div className="size-2 rounded-full bg-chart-5" />
					</div>
					<div className="typography-h3">{maintenanceCount}</div>
					<div className="text-xs mt-1 text-chart-5">Needs attention</div>
				</div>
			</div>

			{/* Units Content */}
			<div className="px-4 lg:px-6">
				<div className="mb-6">
					<h1 className="typography-h2 text-foreground mb-2">
						Unit Management
					</h1>
					<p className="text-muted-foreground">
						Manage individual units across all properties
					</p>
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Units Table with DiceUI DataTable */}
				<div className="rounded-md border bg-card shadow-sm">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<p className="mt-4 text-muted-foreground">Loading units...</p>
						</div>
					) : units.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12">
							<DoorOpen className="size-12 text-muted-foreground/50" />
							<p className="mt-4 text-muted-foreground">No units found.</p>
							<NewUnitButton properties={properties} />
						</div>
					) : (
						<DataTable table={table}>
							<div className="flex items-center justify-between gap-4 p-4">
								<DataTableToolbar table={table} />
								<NewUnitButton properties={properties} />
							</div>
						</DataTable>
					)}
				</div>
			</div>
		</div>
	)
}

interface NewUnitButtonProps {
	properties?: Array<{ id: string; name: string }>
}

function NewUnitButton({ properties }: NewUnitButtonProps) {
	const qc = useQueryClient()
	const create = useCreateUnitMutation()
	const closeButtonRef = useRef<HTMLButtonElement>(null)

	async function onSubmit(form: HTMLFormElement) {
		try {
			const fd = new FormData(form)
			await create.mutateAsync({
				unit_number: String(fd.get('unit_number') || ''),
				bedrooms: Number(fd.get('bedrooms') || 0),
				bathrooms: Number(fd.get('bathrooms') || 0),
				rent_amount: Number(fd.get('rent') || 0),
				property_id: String(fd.get('property_id') || ''),
				rent_currency: 'USD',
				rent_period: 'monthly',
				status: 'available'
			} satisfies UnitInput)
			qc.invalidateQueries({ queryKey: ownerDashboardKeys.analytics.stats() })
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
					<DialogTitle className="text-foreground">
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
							<Label htmlFor="unit_number">Unit Number</Label>
							<Input
								name="unit_number"
								id="unit_number"
								required
								placeholder="101"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="property_id">Property</Label>
							<Select name="property_id" required>
								<SelectTrigger>
									<SelectValue placeholder="Select property" />
								</SelectTrigger>
								<SelectContent>
									{properties?.map((property) => (
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
