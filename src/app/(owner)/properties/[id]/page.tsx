'use client'

import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'
import { Card, CardContent, CardHeader } from '#components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PropertyDetails } from '../property-details.client'

function PropertyDetailSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-80" />
					<Skeleton className="h-4 w-48" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-11 w-20" />
					<Skeleton className="h-11 w-11" />
				</div>
			</div>

			{/* Units section skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>

			{/* Images section skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default function PropertyDetailPage() {
	const params = useParams()
	const property_id = params.id as string

	const {
		data: property,
		isLoading,
		isError
	} = useQuery(propertyQueries.detail(property_id))

	if (isLoading) {
		return <PropertyDetailSkeleton />
	}

	if (isError || !property) {
		return (
			<div className="flex-col-center space-y-4 text-center section-spacing-compact">
				<div className="text-2xl">Property not found</div>
				<Button asChild>
					<Link href="/properties">Back to Properties</Link>
				</Button>
			</div>
		)
	}

	return <PropertyDetails property={property} />
}
