'use client'

import { useEffect } from 'react'

/**
 * Warns user before navigating away from a page with unsaved form data.
 * Uses the browser's beforeunload event.
 *
 * @param isDirty - Whether the form has unsaved changes
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return

		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault()
			// Modern browsers show their own generic message regardless of returnValue
		}

		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	}, [isDirty])
}
