import type { Metadata } from 'next/types'
import { PropertiesPageClient } from './properties-page.client'

export const metadata: Metadata = {
	title: 'Properties | TenantFlow',
	description: 'Manage your real estate properties and portfolio'
}

export default function PropertiesPage() {
	return <PropertiesPageClient />
}
