'use client'

import { useCallback, useMemo, useState } from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
	useQuery,
	useQueries,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'
import { createClient } from '#lib/supabase/client'
import type { Unit } from '#types/core'
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
import {
	PropertyInsightsSection,
	PropertyInsightsSkeleton
} from '#components/analytics/property-insights-section'
import { transformToPropertyItem, calculateSummary } from './components/property-transforms'
import { PropertiesLoadingSkeleton } from './components/properties-loading-skeleton'

export default function PropertiesPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const queryClient = useQueryClient()
	const [propertyToDelete, setPropertyToDelete] = useState<string | null>(
		null
	)

	// Tab state from URL
	const tabFromUrl = searchParams.get('tab') || 'overview'
	const [activeTab, setActiveTab] = useState(tabFromUrl)

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
	const { data: propertiesResponse, isLoading, error } = useQuery(
		propertyQueries.list()
	)
	const rawProperties = useMemo(
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
	const unitsMap = useMemo(() => {
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

	const imagesMap = useMemo(() => {
		const map: Record<string, string | undefined> = {}
		rawProperties.forEach((p, i) => {
			const images = imagesData[i]
			map[p.id] = images?.[0]?.image_url
		})
		return map
	}, [rawProperties, imagesData])

	// Transform to design-os format
	const properties = useMemo(
		() =>
			rawProperties.map(p =>
				transformToPropertyItem(p, unitsMap[p.id], imagesMap[p.id])
			),
		[rawProperties, unitsMap, imagesMap]
	)

	// Calculate summary (use API total for accurate count across pages)
	const summary = useMemo(
		() => ({
			...calculateSummary(properties),
			totalProperties: propertiesResponse?.total ?? properties.length
		}),
		[properties, propertiesResponse?.total]
	)

	// Delete mutation -- soft-delete: set status to 'inactive'
	const { mutate: deleteProperty } = useMutation({
		mutationFn: async (propertyId: string) => {
			const supabase = createClient()
			const { error } = await supabase
				.from('properties')
				.update({ status: 'inactive' })
				.eq('id', propertyId)
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Property deleted')
			queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		},
		onError: () => {
			toast.error('Failed to delete property')
		}
	})

	// Callbacks
	const handleAddProperty = useCallback(() => {
		router.push('/properties/new')
	}, [router])

	const handlePropertyClick = useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}`)
		},
		[router]
	)

	const handlePropertyEdit = useCallback(
		(propertyId: string) => {
			router.push(`/properties/${propertyId}/edit`)
		},
		[router]
	)

	const handlePropertyDelete = useCallback(
		(propertyId: string) => {
			setPropertyToDelete(propertyId)
		},
		[]
	)

	const confirmDelete = useCallback(() => {
		if (propertyToDelete) {
			deleteProperty(propertyToDelete)
			setPropertyToDelete(null)
		}
	}, [propertyToDelete, deleteProperty])

	if (isLoading) {
		return <PropertiesLoadingSkeleton />
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Properties
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load properties'}
					</p>
				</div>
			</div>
		)
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
