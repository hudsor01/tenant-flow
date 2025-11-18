'use client'

import { Button } from '#components/ui/button'
import { useProperty } from '#hooks/api/use-properties'
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
	} = useProperty(property_id)

	if (isLoading) {
		return <div className="animate-pulse">Loading property...</div>
	}

	if (isError || !property) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 text-center section-spacing-compact">
				<div className="text-2xl">Property not found</div>
				<Button asChild>
					<Link href="/manage/properties">Back to Properties</Link>
				</Button>
			</div>
		)
	}

	return <PropertyDetails property={property} />
}
