import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Settings',
	description: 'Manage account settings, notifications, security, and billing'
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
