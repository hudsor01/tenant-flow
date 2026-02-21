import type { Metadata } from 'next'
import { VendorsPageClient } from '#components/maintenance/vendors-page.client'

export const metadata: Metadata = {
	title: 'Vendors | TenantFlow',
	description: 'Manage your contractors and vendors',
}

export default function VendorsPage() {
	return <VendorsPageClient />
}
