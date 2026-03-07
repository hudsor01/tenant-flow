import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Leases',
	description: 'Manage lease agreements, renewals, and terminations'
}

export default function LeasesLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
