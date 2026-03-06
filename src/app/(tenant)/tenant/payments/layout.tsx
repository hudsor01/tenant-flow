import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Payments',
	description: 'View payment history and manage autopay'
}

export default function TenantPaymentsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
