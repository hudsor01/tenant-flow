import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'
import { PropertyEditForm } from './property-edit-form.client'

export default async function EditPropertyPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	await requireSession()

	// Fetch property data on server
	const property = await serverFetch<import('@repo/shared/types/core').Property>(`/api/v1/properties/${id}`)

	return <PropertyEditForm property={property} />
}
