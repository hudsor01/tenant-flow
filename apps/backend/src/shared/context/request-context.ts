import { AsyncLocalStorage } from 'async_hooks'

/**
 * Simple request context using Node.js AsyncLocalStorage
 * Replaces all custom request context services with native solution
 */
export interface RequestContext {
	correlationId: string
	userId?: string
	organizationId?: string
	startTime: number
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export const getRequestContext = (): RequestContext | undefined => {
	return requestContextStorage.getStore()
}
