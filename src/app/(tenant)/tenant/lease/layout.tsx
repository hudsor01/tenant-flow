import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'My Lease',
	description: 'View your current lease details and agreement'
}

export default function TenantLeaseLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
