import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsVaultClient } from '../documents-vault.client'
import { documentSearchQueries } from '#hooks/api/query-keys/document-keys'

const mockUseQuery = vi.fn()
const mockSetQueryParam = vi.fn()
const mockSetEntityParam = vi.fn()
const mockSetPageParam = vi.fn()

let queryParamValue = ''
let entityParamValue = '__any__'
let pageParamValue = 0

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return { ...actual, useQuery: () => mockUseQuery() }
})

// nuqs hooks call into Next's router; mock to a controllable shape so the
// component renders deterministically in unit tests without a routing
// provider.
vi.mock('nuqs', async () => {
	const actual = await vi.importActual<typeof import('nuqs')>('nuqs')
	return {
		...actual,
		useQueryState: (key: string) => {
			if (key === 'q') return [queryParamValue, mockSetQueryParam]
			if (key === 'entity') return [entityParamValue, mockSetEntityParam]
			if (key === 'page') return [pageParamValue, mockSetPageParam]
			return ['', vi.fn()]
		}
	}
})

function renderVault(): ReturnType<typeof render> {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	})
	const ui: ReactElement = (
		<QueryClientProvider client={queryClient}>
			<DocumentsVaultClient />
		</QueryClientProvider>
	)
	return render(ui)
}

describe('DocumentsVaultClient', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		queryParamValue = ''
		entityParamValue = '__any__'
		pageParamValue = 0
	})

	it('renders the page header and search controls', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isError: false
		})
		renderVault()
		expect(screen.getByText('Documents vault')).toBeInTheDocument()
		expect(screen.getByLabelText(/search documents/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/filter by entity type/i)).toBeInTheDocument()
	})

	it('renders empty-state copy when no documents match', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isError: false
		})
		renderVault()
		expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument()
	})

	it('renders skeletons during loading', () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false
		})
		const { container } = renderVault()
		// Five Skeleton placeholders are emitted by the loading branch;
		// each renders with `data-slot="skeleton"` (stable test hook,
		// independent of CSS class drift).
		expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(5)
	})

	it('renders error-state with Try again on query failure', () => {
		const refetch = vi.fn()
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch
		})
		renderVault()
		expect(screen.getByText(/couldn't load your documents/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /try again/i })
		).toBeInTheDocument()
	})

	it('shows "showing X-Y of N" when results exist', () => {
		mockUseQuery.mockReturnValue({
			data: {
				rows: [
					{
						id: 'doc-1',
						entity_type: 'property',
						entity_id: 'p',
						document_type: 'other',
						mime_type: 'application/pdf',
						file_path: 'property/p/1-test.pdf',
						storage_url: 'property/p/1-test.pdf',
						file_size: 1024,
						title: 'Test',
						tags: null,
						description: null,
						owner_user_id: 'o',
						created_at: '2026-04-25T00:00:00Z',
						signed_url: null
					}
				],
				totalCount: 1,
				page: 0,
				pageSize: 50
			},
			isLoading: false,
			isError: false
		})
		renderVault()
		expect(screen.getByText(/1 document/i)).toBeInTheDocument()
		expect(screen.getByText(/showing 1-1 of 1/i)).toBeInTheDocument()
	})

	it('hides the range header during pagination refetch (isFetching)', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 5, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: true,
			isError: false
		})
		renderVault()
		// Stale data shouldn't show "Showing X-Y of N" while a new page is
		// being fetched — H3/M4 from cycle-1 audit.
		expect(screen.queryByText(/showing.*of/i)).not.toBeInTheDocument()
	})

	function pagedResult(page: number, totalCount: number, rowCount: number) {
		return {
			data: {
				rows: Array.from({ length: rowCount }, (_, i) => ({
					id: `doc-${page}-${i}`,
					entity_type: 'property',
					entity_id: 'p',
					document_type: 'other',
					mime_type: 'application/pdf',
					file_path: `property/p/${page}-${i}.pdf`,
					storage_url: `property/p/${page}-${i}.pdf`,
					file_size: 1,
					title: `Doc ${page}-${i}`,
					tags: null,
					description: null,
					owner_user_id: 'o',
					created_at: '2026-04-25T00:00:00Z',
					signed_url: null
				})),
				totalCount,
				page,
				pageSize: 50
			},
			isLoading: false,
			isFetching: false,
			isError: false
		}
	}

	it('Previous/Next buttons enabled on a middle page', () => {
		pageParamValue = 1 // page 2 of 4
		mockUseQuery.mockReturnValue(pagedResult(1, 200, 50))
		renderVault()
		expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
		expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
	})

	it('Previous disabled on the first page; Next enabled when more pages exist', () => {
		pageParamValue = 0
		mockUseQuery.mockReturnValue(pagedResult(0, 100, 50)) // 50 rows of 100, more remaining
		renderVault()
		expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
		expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
	})

	it('Next disabled on the last page; Previous enabled', () => {
		pageParamValue = 1 // page 2 of 2 — last page
		mockUseQuery.mockReturnValue(pagedResult(1, 100, 50)) // 50 rows, pageEnd=100 === totalCount
		renderVault()
		expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
		expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
	})

	it('auto-resets pageParam to 0 when page is out of bounds (cycle-2 L1)', () => {
		pageParamValue = 99 // bookmarked URL pointing past the data
		mockUseQuery.mockReturnValue({
			// Empty rows but totalCount > 0 means user has docs, just on a
			// page that no longer exists.
			data: { rows: [], totalCount: 12, page: 99, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		// The auto-reset useEffect should have called setPageParam(null).
		expect(mockSetPageParam).toHaveBeenCalledWith(null)
	})

	it('does NOT auto-reset pageParam when on a valid page (cycle-3 N3)', () => {
		// Negative branch of cycle-2 L1: a regression that always-fires the
		// reset effect (e.g., dropping the `totalCount > 0` or `rows.length
		// === 0` guard) would silently clobber the user's page state.
		pageParamValue = 1 // valid middle page
		mockUseQuery.mockReturnValue(pagedResult(1, 200, 50))
		renderVault()
		expect(mockSetPageParam).not.toHaveBeenCalled()
	})

	it('treats an unknown URL entity filter as "All types" (H2 guard)', () => {
		// Attacker- or stale-bookmark-supplied URL like ?entity=banana
		// must not flow into the RPC as a typed DocumentEntityType.
		// Spy directly on the query factory so we can assert the exact
		// params shape passed in — that's the wire we care about (cycle-2 N1).
		entityParamValue = 'banana'
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		const listSpy = vi.spyOn(documentSearchQueries, 'list')
		try {
			renderVault()
			expect(listSpy).toHaveBeenCalled()
			const params = listSpy.mock.calls.at(-1)?.[0] as
				| { entityType?: unknown; query?: unknown; page?: unknown }
				| undefined
			expect(params).toBeDefined()
			// The component spreads `entityType` only when truthy, so an
			// invalid URL value should yield an object WITHOUT the key.
			expect(params).not.toHaveProperty('entityType')
			// Fallback empty state still renders (no crash, no rows).
			expect(
				screen.getByText(/no documents uploaded yet/i)
			).toBeInTheDocument()
		} finally {
			listSpy.mockRestore()
		}
	})

	it('syncs search input when queryParam changes externally (H1 regression)', () => {
		// First render: q="" → input is empty.
		queryParamValue = ''
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		const { rerender } = renderVault()
		const input = screen.getByLabelText(/search documents/i) as HTMLInputElement
		expect(input.value).toBe('')

		// Simulate external URL change (browser back / shared link). The
		// useEffect that syncs queryParam → searchInput must fire.
		queryParamValue = 'lease'
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } }
		})
		act(() => {
			rerender(
				<QueryClientProvider client={queryClient}>
					<DocumentsVaultClient />
				</QueryClientProvider>
			)
		})
		const inputAfter = screen.getByLabelText(
			/search documents/i
		) as HTMLInputElement
		expect(inputAfter.value).toBe('lease')
	})

	it('debounces search input and commits to URL after 300ms (M2 path)', () => {
		// Cycle-1 M2 promised an honest exercise of the debounce path —
		// just verifying controlled-input echo isn't enough. Fake timers
		// let us assert: (1) no commit before 300ms, (2) commit AFTER
		// 300ms with the latest value, (3) page resets when query changes.
		vi.useFakeTimers()
		try {
			mockUseQuery.mockReturnValue({
				data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			const input = screen.getByLabelText(
				/search documents/i
			) as HTMLInputElement

			act(() => {
				fireEvent.change(input, { target: { value: 'tax' } })
			})
			expect(input.value).toBe('tax')
			// Pre-debounce: nothing committed yet.
			expect(mockSetQueryParam).not.toHaveBeenCalled()

			// Just-before-debounce-fires: still nothing.
			act(() => {
				vi.advanceTimersByTime(299)
			})
			expect(mockSetQueryParam).not.toHaveBeenCalled()

			// Cross the threshold — debounce fires.
			act(() => {
				vi.advanceTimersByTime(1)
			})
			expect(mockSetQueryParam).toHaveBeenCalledWith('tax')
			// Page resets so a stale ?page=N doesn't out-of-bounds the new query.
			expect(mockSetPageParam).toHaveBeenCalledWith(null)
		} finally {
			vi.useRealTimers()
		}
	})
})
