import { vi } from 'vitest'

type QueryResult = {
	data?: unknown
	error?: unknown
	count?: number | null
}

/**
 * Creates a fully chainable PostgREST query mock.
 * Replaces per-file makeQueryChain/buildQueryChain/setupChainedMock functions.
 *
 * @example
 * ```typescript
 * const chain = createQueryChain({ data: [mockProperty], error: null, count: 1 })
 * supabaseFromMock.mockReturnValue(chain)
 * ```
 */
export function createQueryChain(result: QueryResult) {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {}

	const resolver = () =>
		Promise.resolve({
			data: result.data ?? null,
			error: result.error ?? null,
			count: result.count ?? null
		})

	const CHAINABLE_METHODS = [
		'select',
		'insert',
		'update',
		'upsert',
		'delete',
		'eq',
		'neq',
		'gt',
		'gte',
		'lt',
		'lte',
		'like',
		'ilike',
		'is',
		'in',
		'not',
		'or',
		'and',
		'filter',
		'match',
		'contains',
		'containedBy',
		'textSearch',
		'order',
		'range',
		'limit',
		'csv',
		'head'
	] as const

	const TERMINAL_METHODS = ['single', 'maybeSingle'] as const

	for (const method of CHAINABLE_METHODS) {
		chain[method] = vi.fn(() => chain)
	}

	for (const method of TERMINAL_METHODS) {
		chain[method] = vi.fn(() => resolver())
	}

	// Allow awaiting the chain directly (for queries without .single())
	Object.defineProperty(chain, 'then', {
		get() {
			return resolver().then.bind(resolver())
		}
	})

	return chain
}

/**
 * Creates a Supabase client mock with configurable `from()` responses.
 * Designed for use with vi.mock('#lib/supabase/client').
 *
 * @example
 * ```typescript
 * const { fromMock, setQueryResult, authMocks } = createSupabaseClientMock()
 *
 * vi.mock('#lib/supabase/client', () => ({
 *   createClient: () => ({
 *     from: fromMock,
 *     auth: authMocks
 *   })
 * }))
 *
 * // In test:
 * setQueryResult('properties', { data: [mockProperty], error: null })
 * ```
 */
export function createSupabaseClientMock() {
	const tableChains = new Map<
		string,
		Record<string, ReturnType<typeof vi.fn>>
	>()
	let defaultResult: QueryResult = { data: [], error: null, count: 0 }

	const fromMock = vi.fn((table: string) => {
		if (tableChains.has(table)) {
			return tableChains.get(table)!
		}
		return createQueryChain(defaultResult)
	})

	const authMocks = {
		getUser: vi.fn().mockResolvedValue({
			data: {
				user: { id: 'owner-user-123', email: 'owner@example.com' }
			}
		}),
		getSession: vi.fn().mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		}),
		signOut: vi.fn().mockResolvedValue({ error: null })
	}

	function setQueryResult(table: string, result: QueryResult) {
		tableChains.set(table, createQueryChain(result))
	}

	function setDefaultResult(result: QueryResult) {
		defaultResult = result
	}

	return {
		fromMock,
		authMocks,
		setQueryResult,
		setDefaultResult,
		createQueryChain
	}
}
