import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Tenants',
	description: 'Manage tenants, invitations, and tenant details'
}

export default function TenantsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
