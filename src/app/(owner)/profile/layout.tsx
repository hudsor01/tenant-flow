import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Profile',
	description: 'View and manage your account information'
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
