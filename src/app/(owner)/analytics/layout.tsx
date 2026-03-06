import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Analytics',
	description: 'Property performance analytics and insights'
}

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
