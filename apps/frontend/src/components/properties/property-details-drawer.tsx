'use client'

import { useState } from 'react'
import { useProperty } from '@/hooks/api/use-properties'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']

interface PropertyDetailsDrawerProps {
	propertyId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onEdit?: () => void
	onDelete?: () => void
}

export function PropertyDetailsDrawer({
	propertyId,
	open,
	onOpenChange,
	onEdit,
	onDelete
}: PropertyDetailsDrawerProps) {
	const [activeTab, setActiveTab] = useState('overview')
	const {
		data: property,
		isLoading,
		error
	} = useProperty(propertyId || '', {
		enabled: !!propertyId
	})

	if (!propertyId) {
		return null
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-2xl">
				<SheetHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
								<i className="i-lucide-building-2 inline-block text-primary h-5 w-5"  />
							</div>
							<div>
								<SheetTitle>
									{property?.name || 'Loading...'}
								</SheetTitle>
								<SheetDescription className="mt-1 flex items-center gap-1">
									<i className="i-lucide-map-pin inline-block h-3 w-3"  />
									{property?.address || 'Loading address...'}
								</SheetDescription>
							</div>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={onEdit}
								aria-label="Edit property"
							>
								<i className="i-lucide-edit-3 inline-block h-4 w-4"  />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={onDelete}
								aria-label="Delete property"
							>
								<i className="i-lucide-trash-2 inline-block h-4 w-4"  />
							</Button>
						</div>
					</div>
				</SheetHeader>

				{isLoading && (
					<div className="mt-6 space-y-4">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-48 w-full" />
						<Skeleton className="h-48 w-full" />
					</div>
				)}

				{error && (
					<Alert variant="destructive" className="mt-6">
						<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
						<AlertDescription>
							Failed to load property details. Please try again.
						</AlertDescription>
					</Alert>
				)}

				{property && (
					<ScrollArea className="mt-6 h-[calc(100vh-120px)]">
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="overview">
									Overview
								</TabsTrigger>
								<TabsTrigger value="units">Units</TabsTrigger>
								<TabsTrigger value="financials">
									Financials
								</TabsTrigger>
								<TabsTrigger value="documents">
									Documents
								</TabsTrigger>
							</TabsList>

							<TabsContent value="overview" className="space-y-4">
								<PropertyOverview property={property} />
							</TabsContent>

							<TabsContent value="units" className="space-y-4">
								<PropertyUnits property={property} />
							</TabsContent>

							<TabsContent
								value="financials"
								className="space-y-4"
							>
								<PropertyFinancials property={property} />
							</TabsContent>

							<TabsContent
								value="documents"
								className="space-y-4"
							>
								<PropertyDocuments property={property} />
							</TabsContent>
						</Tabs>
					</ScrollArea>
				)}
			</SheetContent>
		</Sheet>
	)
}

function PropertyOverview({ property }: { property: Property }) {
	const totalUnits = property.units?.length ?? 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED').length ?? 0
	const vacantUnits = totalUnits - occupiedUnits
	const occupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Property Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-muted-foreground text-sm">
								Property Type
							</p>
							<Badge
								variant="secondary"
								className="mt-1 capitalize"
							>
								{property.propertyType}
							</Badge>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Year Built
							</p>
							<p className="font-medium">
								{property.yearBuilt || 'N/A'}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Total Size
							</p>
							<p className="font-medium">
								{property.totalSize
									? `${property.totalSize} sq ft`
									: 'N/A'}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">
								Added Date
							</p>
							<p className="font-medium">
								{property.createdAt
									? format(
											new Date(property.createdAt),
											'MMM dd, yyyy'
										)
									: 'N/A'}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Occupancy Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								Occupancy Rate
							</span>
							<div className="flex items-center gap-2">
								<Badge
									variant={
										occupancyRate >= 90
											? 'default'
											: occupancyRate >= 70
												? 'secondary'
												: 'destructive'
									}
								>
									{occupancyRate}%
								</Badge>
								{occupancyRate >= 90 ? (
									<i className="i-lucide-trending-up inline-block h-4 w-4 text-green-600" data-testid="trending-up-icon" />
								) : (
									<i className="i-lucide-trending-down inline-block h-4 w-4 text-red-600" data-testid="trending-down-icon" />
								)}
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4 text-center">
							<div>
								<p className="text-2xl font-bold">
									{totalUnits}
								</p>
								<p className="text-muted-foreground text-xs">
									Total Units
								</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-green-600">
									{occupiedUnits}
								</p>
								<p className="text-muted-foreground text-xs">
									Occupied
								</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-yellow-600">
									{vacantUnits}
								</p>
								<p className="text-muted-foreground text-xs">
									Vacant
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Property Manager</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
							<i className="i-lucide-user inline-block text-primary h-5 w-5"  />
						</div>
						<div className="flex-1">
							<p className="font-medium">
								{property.manager?.name || 'Not Assigned'}
							</p>
							{property.manager && (
								<div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
									<span className="flex items-center gap-1">
										<i className="i-lucide-phone inline-block h-3 w-3"  />
										{property.manager.phone}
									</span>
									<span className="flex items-center gap-1">
										<i className="i-lucide-mail inline-block h-3 w-3"  />
										{property.manager.email}
									</span>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	)
}

function PropertyUnits({ property }: { property: Property }) {
	const units = property.units ?? []

	if (units.length === 0) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="text-center">
						<i className="i-lucide-home inline-block text-muted-foreground/50 mx-auto mb-3 h-12 w-12"  />
						<p className="text-muted-foreground">
							No units added yet
						</p>
						<Button className="mt-4" size="sm">
							Add Unit
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-3">
			{units.map(unit => (
				<Card key={unit.id}>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
									<i className="i-lucide-home inline-block text-primary h-4 w-4"  />
								</div>
								<div>
									<p className="font-medium">
										Unit {unit.unitNumber}
									</p>
									<p className="text-muted-foreground text-sm">
										{unit.bedrooms} bed, {unit.bathrooms}{' '}
										bath • {unit.squareFeet} sq ft
									</p>
								</div>
							</div>
							<div className="text-right">
								<Badge
									variant={
										unit.status === 'OCCUPIED'
											? 'default'
											: unit.status === 'VACANT'
												? 'secondary'
												: 'outline'
									}
								>
									{unit.status}
								</Badge>
								<p className="mt-1 text-sm font-medium">
									${unit.rentAmount}/mo
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

function PropertyFinancials({ property }: { property: Property }) {
	const totalMonthlyRent =
		property.units?.reduce(
			(sum, unit) =>
				unit.status === 'OCCUPIED' ? sum + (unit.rentAmount ?? 0) : sum,
			0
		) ?? 0
	const potentialMonthlyRent =
		property.units?.reduce(
			(sum, unit) => sum + (unit.rentAmount ?? 0),
			0
		) ?? 0

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Revenue Overview</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								Current Monthly Revenue
							</span>
							<span className="text-xl font-bold text-green-600">
								${totalMonthlyRent.toLocaleString()}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								Potential Monthly Revenue
							</span>
							<span className="text-lg font-medium">
								${potentialMonthlyRent.toLocaleString()}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								Revenue Loss (Vacancy)
							</span>
							<span className="text-lg font-medium text-red-600">
								-$
								{(
									potentialMonthlyRent - totalMonthlyRent
								).toLocaleString()}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent Transactions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="py-8 text-center">
						<i className="i-lucide-dollar-sign inline-block text-muted-foreground/50 mx-auto mb-3 h-12 w-12"  />
						<p className="text-muted-foreground">
							No recent transactions
						</p>
					</div>
				</CardContent>
			</Card>
		</>
	)
}

function PropertyDocuments({ property: _property }: { property: Property }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Documents</CardTitle>
				<CardDescription>
					Property related documents and files
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="py-8 text-center">
					<i className="i-lucide-file-text inline-block text-muted-foreground/50 mx-auto mb-3 h-12 w-12"  />
					<p className="text-muted-foreground">
						No documents uploaded
					</p>
					<Button className="mt-4" size="sm">
						Upload Document
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
