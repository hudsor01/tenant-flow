import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

/**
 * Opt-in MSW server lifecycle for tests that want network-level interception.
 * Call at the top of a test file (inside describe or at module level).
 *
 * This replaces vi.stubGlobal('fetch') and vi.mock('#lib/supabase/client') patterns.
 * Default handlers return happy-path data. Override per-test with server.use().
 *
 * @example
 * ```typescript
 * import { enableMswServer, server } from '#test/mocks/msw/server'
 * import { http, HttpResponse } from 'msw'
 *
 * enableMswServer()
 *
 * it('shows properties', async () => {
 *   // Uses default handlers - returns DEFAULT_PROPERTY
 *   const { result } = renderHook(() => useProperties(), { wrapper })
 *   await waitFor(() => expect(result.current.data).toHaveLength(1))
 * })
 *
 * it('handles error', async () => {
 *   server.use(
 *     http.get('*\/rest/v1/properties', () => {
 *       return HttpResponse.json({ message: 'error' }, { status: 500 })
 *     })
 *   )
 *   // ...
 * })
 * ```
 */
export function enableMswServer() {
	beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
	afterEach(() => server.resetHandlers())
	afterAll(() => server.close())
}
