import { requireSession } from '@/lib/server-auth'
import type { ReactNode } from 'react'

export default async function OnboardingLayout({
	children
}: {
	children: ReactNode
}) {
	// Only require auth, NOT a primary property (this is the onboarding flow)
	await requireSession()
	return <>{children}</>
}
