'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useOfflineData<T = unknown>(key: string) {
	const queryClient = useQueryClient()
	const [isOnline, setIsOnline] = useState(
		typeof navigator === 'undefined' ? true : navigator.onLine
	)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

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
