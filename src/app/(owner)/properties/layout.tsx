import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Properties',
	description: 'Manage your rental properties and units'
}

export default function PropertiesLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
