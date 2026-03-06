import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Profile',
	description: 'Manage your contact information and account settings'
}

export default function TenantProfileLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
