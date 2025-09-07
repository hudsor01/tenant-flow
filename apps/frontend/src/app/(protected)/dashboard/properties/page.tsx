'use client'

import { useSearchParams } from 'next/navigation'
import type { Database } from '@repo/shared'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useCreateProperty, useProperties } from '@/hooks/api/properties'
import { useCreateUnit, useUnits } from '@/hooks/api/units'
import { unitColumns, type UnitRow } from '@/components/units/units-columns'
import type { ColumnDef } from '@tanstack/react-table'
import { Building, DoorOpen, Plus, TrendingUp, Users, DollarSign } from 'lucide-react'
import { MetricsCard } from '@/components/metrics-card'

type PropertyRow = Database['public']['Tables']['Property']['Row']
type InsertProperty = Database['public']['Tables']['Property']['Insert']
type InsertUnit = Database['public']['Tables']['Unit']['Insert']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']
type PropertyType = Database['public']['Enums']['PropertyType']
type UnitStatus = Database['public']['Enums']['UnitStatus']

export default function PropertiesPage() {
	const searchParams = useSearchParams()
	const status = searchParams.get('status') || undefined
	const activeTab = searchParams.get('tab') || 'properties'
	
	const {
		data: properties = [],
		isLoading: propertiesLoading,
		error: propertiesError
	} = useProperties(status as PropertyStatus | undefined)

	const { data: units = [] } = useUnits()

	// Calculate metrics
	const totalProperties = properties.length
	const totalUnits = units.length
	const occupiedUnits = units.filter(unit => unit.status === 'OCCUPIED').length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const totalRevenue = units.reduce((sum, unit) => sum + (unit.rent || 0), 0)

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Properties Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
				<MetricsCard
					title="Total Properties"
					value={totalProperties}
					description="Active portfolio properties"
					icon={Building}
					colorVariant="property"
				/>

				<MetricsCard
					title="Occupancy Rate"
					value={`${occupancyRate.toFixed(1)}%`}
					description={`${occupiedUnits} of ${totalUnits} units occupied`}
					status="Stable occupancy rate"
					statusIcon={TrendingUp}
					icon={TrendingUp}
					colorVariant="success"
				/>

				<MetricsCard
					title="Monthly Revenue"
					value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue)}
					description="Total rent from all units"
					icon={DollarSign}
					colorVariant="revenue"
				/>
			</div>

			{/* Properties Content */}
			<div className="px-4 lg:px-6">
				<Tabs defaultValue={activeTab} className="w-full">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gradient-primary mb-2">Properties & Units</h1>
							<p className="text-muted-foreground">Manage your property portfolio and individual units</p>
						</div>

						<div className="flex items-center gap-2">
							<Select defaultValue={status ?? 'ALL'}>
								<SelectTrigger className="w-44">
									<SelectValue placeholder="Filter status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">All</SelectItem>
									<SelectItem value="ACTIVE">Active</SelectItem>
									<SelectItem value="UNDER_CONTRACT">Under Contract</SelectItem>
									<SelectItem value="SOLD">Sold</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<TabsList className="grid w-fit grid-cols-2 mb-6">
						<TabsTrigger value="properties" className="flex items-center gap-2">
							<Building className="size-4" />
							Properties
						</TabsTrigger>
						<TabsTrigger value="units" className="flex items-center gap-2">
							<DoorOpen className="size-4" />
							Units
						</TabsTrigger>
					</TabsList>

					<TabsContent value="properties" className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-semibold text-gradient-premium">Properties Portfolio</h2>
								<p className="text-muted-foreground mt-1">
									{properties.length} properties in your portfolio
								</p>
							</div>
							<NewPropertyButton />
						</div>

						{propertiesLoading ? (
							<div className="flex items-center justify-center h-32">
								<p className="text-muted-foreground">Loading properties...</p>
							</div>
						) : propertiesError ? (
							<div className="flex items-center justify-center h-32">
								<p className="text-destructive">Error: {propertiesError.message}</p>
							</div>
						) : (
							<div className="rounded-md border bg-card shadow-sm">
								<Table>
									<TableHeader className="bg-muted/50">
										<TableRow>
											<TableHead className="font-semibold">Property Name</TableHead>
											<TableHead className="font-semibold">Address</TableHead>
											<TableHead className="font-semibold">Type</TableHead>
											<TableHead className="font-semibold">Status</TableHead>
											<TableHead className="font-semibold">Units</TableHead>
											<TableHead className="font-semibold text-right">Created</TableHead>
											<TableHead className="font-semibold">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{properties?.length ? (
											properties.map((property: PropertyRow) => {
												const propertyUnits = units.filter(unit => unit.propertyId === property.id)
												const occupiedUnits = propertyUnits.filter(unit => unit.status === 'OCCUPIED')
												
												return (
													<TableRow key={property.id} className="hover:bg-muted/30">
														<TableCell className="font-medium">{property.name}</TableCell>
														<TableCell className="text-muted-foreground">{property.address}</TableCell>
														<TableCell>
															<Badge variant="outline" className="capitalize">
																{property.propertyType?.toLowerCase().replace('_', ' ')}
															</Badge>
														</TableCell>
														<TableCell>
															<Badge style={{ backgroundColor: 'var(--chart-1)', color: 'white' }}>
																Active
															</Badge>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<span className="font-medium">{occupiedUnits.length}/{propertyUnits.length}</span>
																<Badge variant="secondary" className="text-xs">
																	{propertyUnits.length > 0 
																		? `${Math.round((occupiedUnits.length / propertyUnits.length) * 100)}%` 
																		: '0%'
																	}
																</Badge>
															</div>
														</TableCell>
														<TableCell className="text-right text-muted-foreground">
															{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : '—'}
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-1">
																<Button variant="outline" size="sm">Edit</Button>
																<Button variant="outline" size="sm">View</Button>
															</div>
														</TableCell>
													</TableRow>
												)
											})
										) : (
											<TableRow>
												<TableCell colSpan={7} className="h-24 text-center">
													<div className="flex flex-col items-center gap-2">
														<Building className="size-12 text-muted-foreground/50" />
														<p className="text-muted-foreground">No properties found.</p>
														<NewPropertyButton />
													</div>
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</TabsContent>

					<TabsContent value="units" className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-semibold text-gradient-premium">All Units</h2>
								<p className="text-muted-foreground mt-1">
									{units.length} units across all properties
								</p>
							</div>
							<NewUnitButton />
						</div>

						<UnitsTable
							data={units as UnitRow[]}
							columns={unitColumns as ColumnDef<UnitRow>[]}
						/>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}

// Component definitions remain the same...
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
							const key = 'accessorKey' in col ? String(col.accessorKey) : (col.id ?? `col-${index}`)
							const headerContent = typeof col.header === 'function'
								? col.header({ column: col } as Parameters<NonNullable<typeof col.header>>[0])
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
									const key = 'accessorKey' in col ? String(col.accessorKey) : (col.id ?? `col-${index}`)
									const value = 'accessorKey' in col 
										? (row as Record<string, unknown>)[col.accessorKey as string] 
										: undefined
									const cellContent = col.cell && typeof col.cell === 'function'
										? col.cell({ row: { original: row } } as Parameters<NonNullable<typeof col.cell>>[0])
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

function NewPropertyButton() {
	const create = useCreateProperty()
	async function onSubmit(form: HTMLFormElement) {
		const fd = new FormData(form)
		const insertData: InsertProperty = {
			name: String(fd.get('name') || ''),
			address: String(fd.get('address') || ''),
			city: String(fd.get('city') || ''),
			state: String(fd.get('state') || ''),
			zipCode: String(fd.get('zipCode') || ''),
			ownerId: '',
			propertyType: String(fd.get('propertyType') || 'APARTMENT') as PropertyType
		}
		await create.mutateAsync(insertData)
		;(document.getElementById('new-property-close') as HTMLButtonElement)?.click()
	}
	
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="flex items-center gap-2" style={{ backgroundColor: 'var(--chart-1)' }}>
					<Plus className="size-4" />
					New Property
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-gradient-premium">Create New Property</DialogTitle>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={e => {
						e.preventDefault()
						onSubmit(e.target as HTMLFormElement)
					}}
				>
					<div className="grid gap-2">
						<Label htmlFor="name">Property Name</Label>
						<Input name="name" id="name" required placeholder="e.g. Sunset Apartments" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="address">Address</Label>
						<Input name="address" id="address" required placeholder="123 Main St" />
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div className="grid gap-2">
							<Label htmlFor="city">City</Label>
							<Input name="city" id="city" required />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="state">State</Label>
							<Input name="state" id="state" required />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="zipCode">Zip Code</Label>
							<Input name="zipCode" id="zipCode" required />
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="propertyType">Property Type</Label>
						<Select name="propertyType" defaultValue="APARTMENT">
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="APARTMENT">Apartment</SelectItem>
								<SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
								<SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
								<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
								<SelectItem value="CONDO">Condo</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button id="new-property-close" type="button" variant="outline">
							Cancel
						</Button>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? 'Creating...' : 'Create Property'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function NewUnitButton() {
	const create = useCreateUnit()
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
				<Button variant="outline" className="flex items-center gap-2">
					<Plus className="size-4" />
					New Unit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-gradient-premium">Create New Unit</DialogTitle>
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
							<Input name="unitNumber" id="unitNumber" required placeholder="101" />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="propertyId">Property ID</Label>
							<Input name="propertyId" id="propertyId" required placeholder="Select property..." />
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div className="grid gap-2">
							<Label htmlFor="bedrooms">Bedrooms</Label>
							<Input name="bedrooms" id="bedrooms" type="number" min="0" placeholder="2" />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="bathrooms">Bathrooms</Label>
							<Input name="bathrooms" id="bathrooms" type="number" min="0" step="0.5" placeholder="1.5" />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="rent">Monthly Rent</Label>
							<Input name="rent" id="rent" type="number" min="0" placeholder="1200" />
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button id="new-unit-close" type="button" variant="outline">
							Cancel
						</Button>
						<Button type="submit" disabled={create.isPending}>
							{create.isPending ? 'Creating...' : 'Create Unit'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}