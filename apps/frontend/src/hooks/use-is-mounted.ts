import { useEffect, useState } from 'react'

/**
 * Hook to check if the component has mounted (client-side hydration complete).
 * Use this to defer rendering of components that cause hydration mismatches
 * (e.g., Radix UI components with dynamic IDs).
 */
export function useIsMounted() {
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	return isMounted
}
