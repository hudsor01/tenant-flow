import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Reports',
	description: 'Generate financial, property, tenant, and maintenance reports'
}

export default function ReportsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
