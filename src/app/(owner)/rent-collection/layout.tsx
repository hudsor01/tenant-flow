import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Rent Collection',
	description: 'Manage payments, subscriptions, and collection analytics'
}

export default function RentCollectionLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
