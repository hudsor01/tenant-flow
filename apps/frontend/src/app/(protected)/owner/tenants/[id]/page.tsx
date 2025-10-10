import { TenantDetails } from '../../../tenant-portal/tenant-details.client'

interface TenantPageProps {
	params: { id: string }
}

export default function TenantPage({ params }: TenantPageProps) {
	return <TenantDetails id={params.id} />
}
