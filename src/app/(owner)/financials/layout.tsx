import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Financials',
	description: 'Financial overview, revenue, expenses, and profit analysis'
}

export default function FinancialsLayout({ children }: { children: ReactNode }) {
	return <>{children}</>
}
