'use client'

import { useUnits } from '@/hooks/api/use-units'
import { handleStaticGenerationError } from '@/lib/utils/static-generation'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import Link from 'next/link'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Unit = Database['public']['Tables']['Unit']['Row']

// Use UnitWithProperty_ instead of UnitWithDetails for better type alignment
type UnitDisplayData = Unit & {
	property?: {
		name: string
		address: string
	}
	// Add monthlyRent as alias for rent to handle legacy references
	monthlyRent?: number
}

function UnitRow({ unit }: { unit: UnitDisplayData }) {
	// Get status styling
	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'AVAILABLE':
				return (
					<Badge
						variant="secondary"
						className="bg-green-1 text-green-8"
					>
						Available
					</Badge>
				)
			case 'OCCUPIED':
				return (
					<Badge variant="default" className="bg-blue-5">
						Occupied
					</Badge>
				)
			case 'MAINTENANCE':
				return <Badge variant="destructive">Maintenance</Badge>
			case 'UNAVAILABLE':
				return <Badge variant="outline">Unavailable</Badge>
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	// Format rent amount
	const formatRent = (rent?: number) => {
		if (!rent) return 'Not set'
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(rent)
	}

	// Format square feet
	const formatSquareFeet = (sqft?: number | null) => {
		if (!sqft) return 'N/A'
		return `${sqft.toLocaleString()} sq ft`
	}

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-1 dark:bg-blue-9/20">
						<i className="i-lucide-home h-4 w-4 text-blue-6 dark:text-blue-4"  />
					</div>
					<div className="space-y-1">
						<p className="font-medium leading-none">
							Unit {unit.unitNumber}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-building h-3 w-3"  />
							{unit.property?.name || 'Unknown Property_'}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<i className="i-lucide-users text-muted-foreground h-3 w-3"  />
					{unit.bedrooms}BR / {unit.bathrooms}BA
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<i className="i-lucide-ruler text-muted-foreground h-3 w-3"  />
					{formatSquareFeet(unit.squareFeet)}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<i className="i-lucide-dollar-sign text-muted-foreground h-3 w-3"  />
					{formatRent(unit.rent)}
				</div>
			</TableCell>
			<TableCell>{getStatusBadge(unit.status)}</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Link href={`/units/${unit.id}`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-eye h-4 w-4"  />
						</Button>
					</Link>
					<Link href={`/units/${unit.id}/edit`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-edit-3 h-4 w-4"  />
						</Button>
					</Link>
				</div>
			</TableCell>
		</TableRow>
	)
}

function UnitsTableSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4 p-4">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[150px]" />
					</div>
					<Skeleton className="h-4 w-[80px]" />
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-[80px]" />
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	)
}

interface UnitsTableUIProps {
	units: UnitDisplayData[]
}

function UnitsTableUI({ units }: UnitsTableUIProps) {
	if (!units?.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Units</CardTitle>
					<CardDescription>
						Manage all your property units
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<i className="i-lucide-home text-muted-foreground/50 mb-4 h-16 w-16"  />
						<h3 className="mb-2 text-lg font-medium">
							No units yet
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							Get started by adding your first unit to track
							property inventory.
						</p>
						<Link href="/units/new">
							<Button>
								<i className="i-lucide-plus mr-2 h-4 w-4"  />
								Add First Unit
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Units</CardTitle>
						<CardDescription>
							Manage all your property units
						</CardDescription>
					</div>
					<Link href="/units/new">
						<Button size="sm">
							<i className="i-lucide-plus mr-2 h-4 w-4"  />
							Add Unit
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unit</TableHead>
								<TableHead>Size</TableHead>
								<TableHead>Square Feet</TableHead>
								<TableHead>Rent</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[100px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{units.map(unit => (
								<UnitRow key={unit.id} unit={unit} />
							))}
						</TableBody>
					</Table>
				</div>

				{units.length > 10 && (
					<div className="flex items-center justify-center pt-4">
						<Button variant="outline" size="sm">
							Load more units
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export function UnitsDataTable() {
	const { data: units, isLoading, error } = useUnits()

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Units</CardTitle>
					<CardDescription>
						Manage all your property units
					</CardDescription>
				</CardHeader>
				<CardContent>
					<UnitsTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	// Error handling - graceful fallback for static generation
	if (error) {
		return handleStaticGenerationError(error, (
			<Card>
				<CardHeader>
					<CardTitle>Units</CardTitle>
					<CardDescription>Loading units data...</CardDescription>
				</CardHeader>
				<CardContent>
					<UnitsTableSkeleton />
				</CardContent>
			</Card>
		))
	}

	return <UnitsTableUI units={(units as UnitDisplayData[]) || []} />
}
