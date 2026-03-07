import type { Metadata } from 'next'
import DocumentsClient from '#components/documents/documents.client'

export const metadata: Metadata = {
	title: 'Documents',
	description: 'Manage property documents, leases, and files'
}

export default function DocumentsPage() {
	return <DocumentsClient />
}
