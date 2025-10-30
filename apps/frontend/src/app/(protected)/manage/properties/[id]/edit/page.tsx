import { api } from '#lib/api'
import { requireSession } from '#lib/server-auth'
import { PropertyEditForm } from './property-edit-form.client'

export default async function EditPropertyPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const { accessToken } = await requireSession()

	// Fetch property data on server
	const property = await api<import('@repo/shared/types/core').Property>(`properties/${id}`, { token: accessToken })

	return <PropertyEditForm property={property} />
}
