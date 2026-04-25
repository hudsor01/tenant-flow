import type { Metadata } from 'next'
import { DocumentsVaultClient } from '#components/documents/documents-vault.client'

export const metadata: Metadata = {
	title: 'Documents vault',
	description:
		'Search and filter every document attached to your properties, leases, tenants, and maintenance requests.'
}

export default function DocumentsVaultPage() {
	return <DocumentsVaultClient />
}
