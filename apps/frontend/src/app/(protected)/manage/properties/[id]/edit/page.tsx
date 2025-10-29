import { createServerApi } from '#lib/api-client'
import { requireSession } from '#lib/server-auth'
import { PropertyEditForm } from './property-edit-form.client'

export default async function EditPropertyPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const { accessToken } = await requireSession()
	const serverApi = createServerApi(accessToken)

	// Fetch property data on server
	const property = await serverApi.properties.get(id)

	return <PropertyEditForm property={property} />
}
