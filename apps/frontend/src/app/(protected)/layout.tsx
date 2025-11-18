import { requireSession } from '#lib/server-auth'
import { MobileChrome } from '#components/layout/mobile-chrome'
import type { ReactNode } from 'react'

export default async function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	await requireSession()
	return <MobileChrome>{children}</MobileChrome>
}
