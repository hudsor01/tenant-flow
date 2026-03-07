import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Maintenance Requests',
	description: 'View and manage your maintenance requests'
}

export default function TenantMaintenanceLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
