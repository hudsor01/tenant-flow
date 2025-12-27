import type { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Query } from '@tanstack/react-query'
import type { Persister } from '@tanstack/react-query-persist-client'

type Logger = ReturnType<typeof createLogger>

type PersistOptions = {
	persister: Persister
	maxAge: number
	buster: string
}

const AUTH_QUERY_KEY = 'auth'

const isSerializable = (data: unknown) => {
	try {
		JSON.stringify(data)
		return true
	} catch {
		return false
	}
}

const shouldDehydrateQuery = (query: Query) => {
	const queryState = query.state

	if (queryState.status === 'pending' || queryState.fetchStatus === 'fetching') {
		return false
	}

	if (queryState.status === 'error') {
		return false
	}

	const queryKey = query.queryKey[0] as string | undefined
	if (queryKey === AUTH_QUERY_KEY) {
		return false
	}

	if (queryState.data && !isSerializable(queryState.data)) {
		return false
	}

	return queryState.status === 'success' && queryState.data !== null
}

export const buildPersistOptions = ({
	persister,
	maxAge,
	buster
}: PersistOptions) => {
	return {
		persister,
		maxAge,
		buster,
		dehydrateOptions: {
			shouldDehydrateQuery
		}
	}
}

export const createIdbPersister = async (
	logger: Logger,
	cacheKey: string
): Promise<Persister | null> => {
	try {
		const { del, get, set } = await import('idb-keyval')

		const idbPersister: Persister = {
			persistClient: async (client: unknown) => {
				try {
					await set(cacheKey, client)
				} catch (error) {
					logger.error('IndexedDB persist failed - cache not saved', {
						action: 'persist_client_error',
						metadata: {
							error: error instanceof Error ? error.message : String(error),
							errorType: error instanceof Error ? error.name : 'Unknown'
						}
					})
				}
			},
			restoreClient: async () => {
				try {
					const cached = await get(cacheKey)
					if (cached === undefined) {
						logger.info('IndexedDB cache miss - no cached data found')
					}
					return cached
				} catch (error) {
					logger.error(
						'IndexedDB restore failed - treating as cache miss',
						{
							action: 'restore_client_error',
							metadata: {
								error:
									error instanceof Error
									? error.message
									: String(error),
								errorType:
									error instanceof Error ? error.name : 'Unknown',
								isError: true
							}
						}
					)
					return undefined
				}
			},
			removeClient: async () => {
				try {
					await del(cacheKey)
				} catch (error) {
					logger.error('IndexedDB remove failed - cache may be stale', {
						action: 'remove_client_error',
						metadata: {
							error: error instanceof Error ? error.message : String(error),
							errorType: error instanceof Error ? error.name : 'Unknown'
						}
					})
				}
			}
		}

		return idbPersister
	} catch (error) {
		logger.warn(
			'Failed to initialize IndexedDB persistence - falling back to in-memory cache',
			{
				action: 'init_persister_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			}
		)
		return null
	}
}
