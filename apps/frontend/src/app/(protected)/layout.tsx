import { requirePrimaryProperty, requireSession } from '@/lib/server-auth'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'

export default async function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	const user = await requireSession()

	// Skip property check for onboarding page to prevent infinite redirect loop
	const headersList = await headers()
	const pathname = headersList.get('x-pathname') || ''

	console.log('Protected layout pathname:', pathname) // DEBUG

	const isOnboardingPage = pathname.includes('/manage/properties/new')

	if (!isOnboardingPage) {
		console.log('Checking primary property for user:', user.id) // DEBUG
		await requirePrimaryProperty(user.id)
	} else {
		console.log('Skipping property check for onboarding page') // DEBUG
	}

	return <>{children}</>
}
