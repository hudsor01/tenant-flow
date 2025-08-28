'use client'

import { useEffect, useState } from 'react'
import { getCSRFToken } from '@/lib/auth/csrf-client'

/**
 * Hidden CSRF token field for forms
 * Automatically fetches and includes CSRF token
 */
export function CSRFTokenField() {
	const [token, setToken] = useState<string>('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let mounted = true

		// Fetch CSRF token on mount
		getCSRFToken()
			.then(fetchedToken => {
				if (mounted) {
					setToken(fetchedToken)
					setLoading(false)
				}
			})
			.catch(error => {
				if (mounted) {
					console.warn('Failed to fetch CSRF token:', error)
					setLoading(false)
				}
			})

		return () => {
			mounted = false
		}
	}, [])

	// Don't render until we have a token or failed to get one
	if (loading) {
		return null
	}

	return <input type="hidden" name="_csrf" value={token} readOnly />
}
