'use client'

import { Button } from '#components/ui/button'
import { propertiesApi } from '#lib/api-client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PropertyDetails } from '../property-details.client'

export default function PropertyDetailPage() {
	const params = useParams()
	const propertyId = params.id as string

	const {
		data: property,
		isLoading,
		isError
	} = useQuery({
		queryKey: ['property', propertyId],
		queryFn: () => propertiesApi.get(propertyId),
		enabled: !!propertyId
	})

	if (isLoading) {
		return <div className="animate-pulse">Loading property...</div>
	}

	if (isError || !property) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center py-12">
				<div className="text-2xl">Property not found</div>
				<Button asChild>
					<Link href="/manage/properties">Back to Properties</Link>
				</Button>
			</div>
		)
	}

	return <PropertyDetails property={property} />
}
