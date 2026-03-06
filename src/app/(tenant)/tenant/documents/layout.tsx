import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Documents',
	description: 'View and download your lease documents and important notices'
}

export default function TenantDocumentsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
