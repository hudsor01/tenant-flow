'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useOfflineData<T = unknown>(key: string) {
	const queryClient = useQueryClient()
	// Always initialize to true to match server rendering and avoid hydration mismatch
	const [isOnline, setIsOnline] = useState(true)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		// Sync with actual browser state after hydration
		setIsOnline(navigator.onLine)

		const handleOnline = () => setIsOnline(true)
		const handleOffline = () => setIsOnline(false)

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	const getOfflineData = () => {
		const queries = queryClient.getQueriesData({ queryKey: [key] })
		const match = queries.find(([queryKey]) => Array.isArray(queryKey) && queryKey[0] === key)
		return (match?.[1] as T[]) ?? []
	}

	return {
		isOnline,
		getOfflineData,
		hasOfflineData: getOfflineData().length > 0
	}
}
