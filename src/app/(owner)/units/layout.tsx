import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Units',
	description: 'Manage rental units across all properties'
}

export default function UnitsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
