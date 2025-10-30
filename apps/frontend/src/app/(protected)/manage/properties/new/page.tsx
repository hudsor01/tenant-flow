import { requireSession } from '#lib/server-auth'
import { CreatePropertyForm } from '../create-property-form.client'

/**
 * New Property Page - Server Component
 * 
 * Ensures session is established before rendering client form.
 * This prevents 401 errors from TanStack Query trying to refetch
 * persisted cache before browser session is ready.
 */
export default async function NewPropertyPage() {
	// ✅ Server-side auth - ensures session exists before client hydration
	await requireSession()
	
	return <CreatePropertyForm />
}
