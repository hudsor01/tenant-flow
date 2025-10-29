import { requireSession } from '#lib/server-auth'
import type { ReactNode } from 'react'

export default async function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	await requireSession()
	return <>{children}</>
}
