import { RouteModal } from '#components/ui/route-modal'
import { TenantEditForm } from '#app/(protected)/tenant/tenant-edit-form.client'
import { notFound } from 'next/navigation'

/**
 * Edit Tenant Modal (Intercepting Route)
 *
 * NOTE: Tenants use separate forms intentionally - CreateTenantForm handles
 * the onboarding workflow (tenant + lease creation), while TenantEditForm
 * handles only tenant info updates. This differs from other entities where
 * create/edit forms share the same fields.
 */
export default async function EditTenantModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	try {
		const { id } = await params

		// Validate id parameter
		if (!id?.trim()) {
			notFound()
		}

		return (
			<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<TenantEditForm id={id.trim()} />
			</RouteModal>
		)
	} catch (error) {
		console.error('Failed to load tenant edit modal:', error)
		notFound()
	}
}
