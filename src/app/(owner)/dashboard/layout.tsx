import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Dashboard',
	description: 'Overview of your property portfolio, revenue, and activity'
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
