import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { Button } from '#components/ui/button'
import { PropertyForm } from '#components/properties/property-form.client'
import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'

export default async function EditPropertyPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	await requireSession()

	// Fetch property data on server
	const property = await serverFetch<import('@repo/shared/types/core').Property>(
		`/api/v1/properties/${id}`
	)

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/manage/properties/${id}`}>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Edit Property</h1>
					<p className="text-muted-foreground">Update property information</p>
				</div>
			</div>
			<PropertyForm mode="edit" property={property} showSuccessState={false} />
		</div>
	)
}
