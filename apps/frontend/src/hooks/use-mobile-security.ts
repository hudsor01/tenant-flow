'use client'

import { useEffect, useState } from 'react'

export function useMobileSecurity() {
	const [isSecure, setIsSecure] = useState(true)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		setIsSecure(window.location.protocol === 'https:')
	}, [])

	return {
		isSecure,
		requiresSecureContext: !isSecure
	}
}
