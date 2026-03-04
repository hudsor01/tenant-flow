export {}

declare global {
	type QueryCache = {
		getAll: () => unknown[]
		find?: (...args: unknown[]) => unknown
		remove?: (...args: unknown[]) => unknown
	}
	type QueryClientShape = {
		getQueryData: (key: unknown[]) => unknown
		getQueryState?: (key: unknown[]) => {
			status?: string
			dataUpdatedAt?: number
			isStale?: boolean
		}
		fetchQuery?: (...args: unknown[]) => unknown
		clear?: () => void
		invalidateQueries?: (...args: unknown[]) => unknown
		getQueriesData?: (...args: unknown[]) => unknown
		getQueryCache?: () => QueryCache
		setQueryData?: (...args: unknown[]) => unknown
	}

	interface Window {
		__QUERY_CLIENT__?: QueryClientShape
		cacheOperations?: Array<{
			type: string
			args: unknown[]
			timestamp?: number
		}>
		testRetryCount?: number
		__intersectionObserverTriggered?: boolean
	}
}
