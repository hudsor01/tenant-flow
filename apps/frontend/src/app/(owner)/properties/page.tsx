'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
	useQuery,
	useQueries,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { apiRequest } from '#lib/api-request'
import type { Property as ApiProperty, Unit } from '@repo/shared/types/core'
import { Skeleton } from '#components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import { Properties } from '#components/properties/properties'
import type {
	PropertyItem,
	PropertySummary,
	PropertyType as DesignPropertyType
} from '#components/properties/types'
import {
	PropertyInsightsSection,
	PropertyInsightsSkeleton
} from '#components/analytics/property-insights-section'

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Map API property type to design-os PropertyType
 */
function mapPropertyType(
	apiType: string | null | undefined
): DesignPropertyType {
	const typeMap: Record<string, DesignPropertyType> = {
		single_family: 'single_family',
		multi_family: 'multi_family',
		multi_unit: 'multi_family',
		apartment: 'apartment',
		condo: 'condo',
		townhouse: 'townhouse',
		duplex: 'duplex'
	}
	return typeMap[apiType?.toLowerCase() ?? ''] ?? 'single_family'
}

/**
 * Transform API property to design-os PropertyItem format
 */
function transformToPropertyItem(
	property: ApiProperty,
	units: Unit[] | undefined,
	imageUrl: string | undefined
): PropertyItem {
	const safeUnits = Array.isArray(units) ? units : []
	const totalUnits = safeUnits.length || 1
	const occupiedUnits = safeUnits.filter(u => u.status === 'occupied').length
	const availableUnits = safeUnits.filter(u => u.status === 'available').length
	const maintenanceUnits = safeUnits.filter(
		u => u.status === 'maintenance'
	).length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const monthlyRevenue = safeUnits
		.filter(u => u.status === 'occupied')
		.reduce((sum, u) => sum + (u.rent_amount ?? 0) * 100, 0) // Convert to cents

	return {
		id: property.id,
		name: property.name,
		addressLine1: property.address_line1,
		addressLine2: property.address_line2 ?? null,
		city: property.city,
		state: property.state,
		postalCode: property.postal_code,
		propertyType: mapPropertyType(property.property_type),
		status:
			property.status === 'active'
				? 'active'
				: property.status === 'inactive'
					? 'inactive'
					: 'active',
		imageUrl,
		totalUnits,
		occupiedUnits,
		availableUnits,
		maintenanceUnits,
		occupancyRate,
		monthlyRevenue
	}
}

/**
 * Calculate portfolio summary from properties
 */
function calculateSummary(properties: PropertyItem[]): PropertySummary {
	const totalProperties = properties.length
	const totalUnits = properties.reduce((sum, p) => sum + p.totalUnits, 0)
	const occupiedUnits = properties.reduce((sum, p) => sum + p.occupiedUnits, 0)
	const availableUnits = properties.reduce(
		(sum, p) => sum + p.availableUnits,
		0
	)
	const maintenanceUnits = properties.reduce(
		(sum, p) => sum + p.maintenanceUnits,
		0
	)
	const overallOccupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
	const totalMonthlyRevenue = properties.reduce(
		(sum, p) => sum + p.monthlyRevenue,
		0
	)

	return {
		totalProperties,
		totalUnits,
		occupiedUnits,
		availableUnits,
		maintenanceUnits,
		overallOccupancyRate,
		totalMonthlyRevenue
	}
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function PropertiesLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
			{/* Stats skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			{/* Portfolio skeleton */}
			<Skeleton className="h-96 rounded-lg" />
		</div>
	)
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PropertiesPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const queryClient = useQueryClient()
	const [propertyToDelete, setPropertyToDelete] = React.useState<string | null>(
		null
	)

	// Tab state from URL
	const tabFromUrl = searchParams.get('tab') || 'overview'
	const [activeTab, setActiveTab] = React.useState(tabFromUrl)

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		const url = new URL(window.location.href)
		if (value === 'overview') {
			url.searchParams.delete('tab')
		} else {
			url.searchParams.set('tab', value)
		}
		router.replace(url.pathname + url.search, { scroll: false })
	}

	// Fetch properties
	const { data: propertiesResponse, isLoading } = useQuery(
		propertyQueries.list()
	)
	const rawProperties = React.useMemo(
		() => propertiesResponse?.data ?? [],
		[propertiesResponse?.data]
	)

	// Fetch all units for all properties using useQueries
	const unitsQueriesResults = useQueries({
		queries: rawProperties.map(p => ({
			...unitQueries.listByProperty(p.id),
			enabled: !!p.id
		}))
	})

	// Extract stable data from units queries
	const unitsData = unitsQueriesResults.map(result => result.data)

	// Get units map by property ID
	const unitsMap = React.useMemo(() => {
		const map: Record<string, Unit[]> = {}
		rawProperties.forEach((p, i) => {
			map[p.id] = unitsData[i] ?? []
		})
		return map
	}, [rawProperties, unitsData])

	// Fetch images for all properties using useQueries
	const imagesQueriesResults = useQueries({
		queries: rawProperties.map(p => ({
			...propertyQueries.images(p.id),
			enabled: !!p.id
		}))
	})

	// Extract stable data from images queries
	const imagesData = imagesQueriesResults.map(result => result.data)

	const imagesMap = React.useMemo(() => {
		const map: Record<string, string | undefined> = {}
		rawProperties.forEach((p, i) => {
			const images = imagesData[i]
			map[p.id] = images?.[0]?.image_url
		})
		return map
	}, [rawProperties, imagesData])

	// Transform to design-os format
	const properties = React.useMemo(
		() =>
			rawProperties.map(p =>
				transformToPropertyItem(p, unitsMap[p.id], imagesMap[p.id])
			),
		[rawProperties, unitsMap, imagesMap]
	)

	// Calculate summary
	const summary = React.useMemo(
		() => calculateSummary(properties),
		[properties]
	)

	// Delete mutation
	const { mutate: deleteProperty } = useMutation({
		mutationFn: async (propertyId: string) =>
			apiRequest<void>(`/api/v1/properties/${propertyId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			toast.success('Property deleted')
			queryClient.invalidateQueries({ queryKey: ['properties'] })
		},
		onError: () => {
			toast.error('Failed to delete property')
		}
	})

	// Callbacks
	const handleAddProperty = React.useCallback(() => {
		router.push('/properties/new')
	}, [router])

	const handlePropertyClick = React.useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}`)
		},
		[router]
	)

	const handlePropertyEdit = React.useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}/edit`)
		},
		[router]
	)

	const handlePropertyDelete = React.useCallback(
		(propertyId: string) => {
			setPropertyToDelete(propertyId)
		},
		[]
	)

	const confirmDelete = React.useCallback(() => {
		if (propertyToDelete) {
			deleteProperty(propertyToDelete)
			setPropertyToDelete(null)
		}
	}, [propertyToDelete, deleteProperty])

	if (isLoading) {
		return <PropertiesLoadingSkeleton />
	}

	return (
		<>
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="w-full"
				>
					<TabsList className="mb-4">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="insights">Insights</TabsTrigger>
					</TabsList>

					<TabsContent value="overview">
						<Properties
							properties={properties}
							summary={summary}
							onPropertyClick={handlePropertyClick}
							onPropertyEdit={handlePropertyEdit}
							onPropertyDelete={handlePropertyDelete}
							onAddProperty={handleAddProperty}
						/>
					</TabsContent>

					<TabsContent value="insights">
						<Suspense fallback={<PropertyInsightsSkeleton />}>
							<PropertyInsightsSection />
						</Suspense>
					</TabsContent>
				</Tabs>
			</div>

			<AlertDialog
				open={propertyToDelete !== null}
				onOpenChange={(open: boolean) => !open && setPropertyToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Property</AlertDialogTitle>
						<AlertDialogDescription>
							This will mark the property as inactive. All associated units and
							data will be preserved but the property will no longer appear in
							your active portfolio.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Property
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
