'use client'

import { Button } from '#components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PropertyDetails } from '../property-details.client'

export default function PropertyDetailPage() {
	const params = useParams()
	const property_id = params.id as string

	const {
		data: property,
		isLoading,
		isError
	} = useQuery(propertyQueries.detail(property_id))

	if (isLoading) {
		return <div className="animate-pulse">Loading property...</div>
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
