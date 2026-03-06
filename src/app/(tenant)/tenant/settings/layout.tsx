import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Settings',
	description: 'Manage your account settings and payment methods'
}

export default function TenantSettingsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
