import type { Metadata } from 'next'
import { TenantsPageClient } from './tenants-page.client'

export const metadata: Metadata = {
	title: 'Tenants | TenantFlow',
	description: 'Manage your property tenants and their lease information'
}

export default function TenantsPage() {
	return <TenantsPageClient />
}
