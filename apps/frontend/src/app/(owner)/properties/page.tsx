'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { apiRequest } from '#lib/api-request'
import type { Property as ApiProperty, Unit } from '@repo/shared/types/core'
import { Skeleton } from '#components/ui/skeleton'
import {
	Properties,
	type PropertyItem,
	type PropertySummary,
	type PropertyType as DesignPropertyType
} from '#components/properties/properties'

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Map API property type to design-os PropertyType
 */
function mapPropertyType(apiType: string | null | undefined): DesignPropertyType {
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
	units: Unit[] = [],
	imageUrl: string | undefined
): PropertyItem {
	const totalUnits = units.length || 1
	const occupiedUnits = units.filter(u => u.status === 'occupied').length
	const availableUnits = units.filter(u => u.status === 'available').length
	const maintenanceUnits = units.filter(u => u.status === 'maintenance').length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const monthlyRevenue = units
		.filter(u => u.status === 'occupied')
		.reduce((sum, u) => sum + ((u.rent_amount ?? 0) * 100), 0) // Convert to cents

	return {
		id: property.id,
		name: property.name,
		addressLine1: property.address_line1,
		addressLine2: property.address_line2 ?? null,
		city: property.city,
		state: property.state,
		postalCode: property.postal_code,
		propertyType: mapPropertyType(property.property_type),
		status: property.status === 'active' ? 'active' : property.status === 'inactive' ? 'inactive' : 'active',
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
	const availableUnits = properties.reduce((sum, p) => sum + p.availableUnits, 0)
	const maintenanceUnits = properties.reduce((sum, p) => sum + p.maintenanceUnits, 0)
	const overallOccupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
	const totalMonthlyRevenue = properties.reduce((sum, p) => sum + p.monthlyRevenue, 0)

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
	const queryClient = useQueryClient()

	// Fetch properties
	const { data: propertiesResponse, isLoading } = useQuery(propertyQueries.list())
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
		() => rawProperties.map(p => transformToPropertyItem(p, unitsMap[p.id], imagesMap[p.id])),
		[rawProperties, unitsMap, imagesMap]
	)

	// Calculate summary
	const summary = React.useMemo(() => calculateSummary(properties), [properties])

	// Delete mutation
	const { mutate: deleteProperty } = useMutation({
		mutationFn: async (propertyId: string) =>
			apiRequest<void>(`/api/v1/properties/${propertyId}`, { method: 'DELETE' }),
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

	const handlePropertyClick = React.useCallback((propertyId: string) => {
		router.push(`/properties/${propertyId}`)
	}, [router])

	const handlePropertyEdit = React.useCallback((propertyId: string) => {
		router.push(`/properties/${propertyId}/edit`)
	}, [router])

	const handlePropertyDelete = React.useCallback((propertyId: string) => {
		// TODO: Add confirmation dialog
		deleteProperty(propertyId)
	}, [deleteProperty])

	const handleBulkImport = React.useCallback(() => {
		toast.info('Bulk import coming soon')
	}, [])

	if (isLoading) {
		return <PropertiesLoadingSkeleton />
	}

	return (
		<Properties
			properties={properties}
			summary={summary}
			onPropertyClick={handlePropertyClick}
			onPropertyEdit={handlePropertyEdit}
			onPropertyDelete={handlePropertyDelete}
			onAddProperty={handleAddProperty}
			onBulkImport={handleBulkImport}
		/>
	)
}
