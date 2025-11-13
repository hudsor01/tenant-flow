import { TenantDetails } from '../../../tenant/tenant-details.client'

export default async function TenantPage({ params }: PageProps<'/manage/tenants/[id]'>) {
	const { id } = await params
	return <TenantDetails id={id} />
}
