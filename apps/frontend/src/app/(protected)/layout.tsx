import { requirePrimaryProperty, requireSession } from '@/lib/server-auth'
import type { ReactNode } from 'react'

export default async function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	const user = await requireSession()
	await requirePrimaryProperty(user.id)
	return <>{children}</>
}
