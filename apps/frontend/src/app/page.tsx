import { redirect } from 'next/navigation'
import { getCurrentUser } from '@repo/shared'

export default async function HomePage() {
	// Check if user is authenticated
	const user = await getCurrentUser()

	if (user) {
		// Authenticated users should go to dashboard
		redirect('/dashboard')
	} else {
		// Unauthenticated users should go to login
		redirect('/login')
	}

	// This should never be reached, but just in case
	return null
}