'use client'

import { useState } from 'react'
import { useCreateProperty, useProperties } from '@/hooks/api/properties'
import { useUnits } from '@/hooks/api/units'
import type { Database } from '@repo/shared'
import { Building, DollarSign, Plus, TrendingUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'




import { PropertyEditViewButtons } from '@/components/properties/edit-button'
import { useCurrentUser } from '@/hooks/use-current-user'

type PropertyRow = Database['public']['Tables']['Property']['Row']
type UnitRow = Database['public']['Tables']['Unit']['Row']
type InsertProperty = Database['public']['Tables']['Property']['Insert']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']
type PropertyType = Database['public']['Enums']['PropertyType']
type _UnitStatus = Database['public']['Enums']['UnitStatus']

export default function PropertiesPage() {
	const searchParams = useSearchParams()
	const status = searchParams?.get('status') || undefined

	const {
		data: properties = [],
		isLoading: propertiesLoading,
		error: propertiesError
	} = useProperties(status as PropertyStatus | undefined)

	const { data: units = [] } = useUnits()

	// Calculate metrics
	const totalProperties = properties.length
	const totalUnits = units.length
	const occupiedUnits = units.filter(
		(unit: UnitRow) => unit.status === 'OCCUPIED'
	).length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const totalRevenue = units.reduce(
		(sum: number, unit: UnitRow) => sum + (unit.rent || 0),
		0
	)

	return (
		<div className="dashboard-root dashboard-main flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Properties Metrics Cards */}
			<div className="dashboard-section dashboard-cards-container grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
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
					value={new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0
					}).format(totalRevenue)}
					description="Total rent from all units"
					icon={DollarSign}
					colorVariant="revenue"
				/>
			</div>

			{/* Properties Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-primary mb-2">
							Properties Portfolio
						</h1>
						<p className="text-muted-foreground">
							Manage your property portfolio and track performance
						</p>
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

				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Portfolio Overview</h2>
							<p className="text-muted-foreground mt-1">
								{properties.length} properties in your portfolio
							</p>
						</div>
						<NewPropertyButton />
					</div>

					{/* Interactive Chart */}
					<ChartAreaInteractive className="mb-6" />

					{propertiesLoading ? (
						<div className="flex items-center justify-center h-32">
							<p className="text-muted-foreground">Loading properties...</p>
						</div>
					) : propertiesError ? (
						<div className="flex items-center justify-center h-32">
							<p className="text-destructive">
								Error: {propertiesError.message}
							</p>
						</div>
					) : (
						<div className="rounded-md border bg-card shadow-sm">
							<Table className="dashboard-table">
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableHead className="font-semibold">
											Property Name
										</TableHead>
										<TableHead className="font-semibold">Address</TableHead>
										<TableHead className="font-semibold">Type</TableHead>
										<TableHead className="font-semibold">Status</TableHead>
										<TableHead className="font-semibold">Units</TableHead>
										<TableHead className="font-semibold text-right">
											Created
										</TableHead>
										<TableHead className="font-semibold">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{properties?.length ? (
										properties.map((property: PropertyRow) => {
											const propertyUnits = units.filter(
												(unit: UnitRow) => unit.propertyId === property.id
											)
											const occupiedUnits = propertyUnits.filter(
												(unit: UnitRow) => unit.status === 'OCCUPIED'
											)

											return (
												<TableRow
													key={property.id}
													className="hover:bg-muted/30"
												>
													<TableCell className="font-medium">
														{property.name}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{property.address}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="capitalize">
															{property.propertyType
																?.toLowerCase()
																.replace('_', ' ')}
														</Badge>
													</TableCell>
													<TableCell>
														<Badge
															style={{
																backgroundColor: 'var(--chart-1)',
																color: 'hsl(var(--primary-foreground))'
															}}
														>
															Active
														</Badge>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<span className="font-medium">
																{occupiedUnits.length}/{propertyUnits.length}
															</span>
															<Badge variant="secondary" className="text-xs">
																{propertyUnits.length > 0
																	? `${Math.round((occupiedUnits.length / propertyUnits.length) * 100)}%`
																	: '0%'}
															</Badge>
														</div>
													</TableCell>
													<TableCell className="text-right text-muted-foreground">
														{property.createdAt
															? new Date(
																	property.createdAt
																).toLocaleDateString()
															: '—'}
													</TableCell>
													<TableCell>
														<PropertyEditViewButtons property={property} />
													</TableCell>
												</TableRow>
											)
										})
									) : (
										<TableRow>
											<TableCell colSpan={7} className="h-24 text-center">
												<div className="flex flex-col items-center gap-2">
													<Building className="size-12 text-muted-foreground/50" />
													<p className="text-muted-foreground">
														No properties found.
													</p>
													<NewPropertyButton />
												</div>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function NewPropertyButton() {
	const [open, setOpen] = useState(false)
	const create = useCreateProperty()
	const { userId, isLoading: userLoading } = useCurrentUser()

	async function onSubmit(form: HTMLFormElement) {
		if (!userId) {
			console.error('No user ID available for property creation')
			return
		}

		const fd = new FormData(form)
		const insertData: InsertProperty = {
			name: String(fd.get('name') || ''),
			address: String(fd.get('address') || ''),
			city: String(fd.get('city') || ''),
			state: String(fd.get('state') || ''),
			zipCode: String(fd.get('zipCode') || ''),
			ownerId: userId,
			propertyType: String(
				fd.get('propertyType') || 'APARTMENT'
			) as PropertyType
		}

		await create.mutateAsync(insertData)
		setOpen(false)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="default"
					className="flex items-center gap-2"
					disabled={userLoading || !userId}
				>
					<Plus className="size-4" />
					New Property
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-gradient-authority">
						Create New Property
					</DialogTitle>
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
						<Input
							name="name"
							id="name"
							required
							placeholder="e.g. Sunset Apartments"
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="address">Address</Label>
						<Input
							name="address"
							id="address"
							required
							placeholder="123 Main St"
						/>
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
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
