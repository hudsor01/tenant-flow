import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsVaultClient } from '../documents-vault.client'
import { documentSearchQueries } from '#hooks/api/query-keys/document-search-keys'

const mockUseQuery = vi.fn()
const mockSetQueryParam = vi.fn()
const mockSetEntityParam = vi.fn()
const mockSetCategoriesParam = vi.fn()
const mockSetFromParam = vi.fn()
const mockSetToParam = vi.fn()
const mockSetPageParam = vi.fn()
const mockToastError = vi.fn()
const mockGetSession = vi.fn()

// Mock the supabase client so getSession() returns a controlled token
// for the Phase 64 bulk-download path.
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: { getSession: mockGetSession }
	})
}))

// Phase 65: vault filter Select reads categories from the per-owner
// taxonomy hook. Mock with the seven seeded defaults so existing
// assertions on category-related rendering keep matching pre-65
// behaviour.
const mockUseDocumentCategories = vi.fn()
vi.mock('#hooks/api/use-document-categories', () => ({
	useDocumentCategories: () => mockUseDocumentCategories()
}))

const SEVEN_DEFAULTS = [
	{ id: 'cat-1', slug: 'lease', label: 'Lease', sort_order: 10, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-2', slug: 'receipt', label: 'Receipt', sort_order: 20, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-3', slug: 'tax_return', label: 'Tax return', sort_order: 30, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-4', slug: 'inspection_report', label: 'Inspection report', sort_order: 40, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-5', slug: 'maintenance_invoice', label: 'Maintenance invoice', sort_order: 50, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-6', slug: 'insurance', label: 'Insurance', sort_order: 60, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-7', slug: 'other', label: 'Other', sort_order: 70, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' }
]

vi.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		success: vi.fn(),
		warning: vi.fn(),
		info: vi.fn()
	}
}))

let queryParamValue = ''
let entityParamValue = '__any__'
let categoriesParamValue: string[] = []
let fromParamValue = ''
let toParamValue = ''
let pageParamValue = 0

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return { ...actual, useQuery: () => mockUseQuery() }
})

// nuqs hooks call into Next's router; mock to a controllable shape so the
// component renders deterministically in unit tests without a routing
// provider. Phase 63 widened the filter set: ?categories=… is now an
// array, ?from / ?to are ISO date strings.
vi.mock('nuqs', async () => {
	const actual = await vi.importActual<typeof import('nuqs')>('nuqs')
	return {
		...actual,
		useQueryState: (key: string) => {
			if (key === 'q') return [queryParamValue, mockSetQueryParam]
			if (key === 'entity') return [entityParamValue, mockSetEntityParam]
			if (key === 'categories')
				return [categoriesParamValue, mockSetCategoriesParam]
			if (key === 'from') return [fromParamValue, mockSetFromParam]
			if (key === 'to') return [toParamValue, mockSetToParam]
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
		categoriesParamValue = []
		fromParamValue = ''
		toParamValue = ''
		pageParamValue = 0
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})
		mockUseDocumentCategories.mockReturnValue({
			categories: SEVEN_DEFAULTS,
			isLoading: false,
			isError: false
		})
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
		// Phase 62 cycle-1 regression guard: the empty-state subtitle must
		// mention every entity type the vault supports. Without this, a
		// future entity addition (e.g. v2.6's deferred items) silently
		// drifts the user-facing copy away from the dropdown.
		const subtitle = screen.getByText(/upload your first document/i)
		expect(subtitle).toHaveTextContent(/property/i)
		expect(subtitle).toHaveTextContent(/lease/i)
		expect(subtitle).toHaveTextContent(/tenant/i)
		expect(subtitle).toHaveTextContent(/maintenance request/i)
		expect(subtitle).toHaveTextContent(/inspection/i)
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

	it('does NOT auto-reset pageParam when on a valid page — rows guard (cycle-3 N3)', () => {
		// Pins the `data.rows.length === 0` guard. With non-empty rows, the
		// effect must not fire even when pageParam > 0.
		pageParamValue = 1 // valid middle page
		mockUseQuery.mockReturnValue(pagedResult(1, 200, 50))
		renderVault()
		expect(mockSetPageParam).not.toHaveBeenCalled()
	})

	it('does NOT auto-reset pageParam when totalCount is 0 — totalCount guard (cycle-4 P3)', () => {
		// Pins the `totalCount > 0` guard. An empty portfolio with a stale
		// pageParam > 0 (e.g., the user deleted everything while looking
		// at page 2) would NOT benefit from a reset — the empty-state copy
		// is the right UX. Without this assertion, dropping the
		// `totalCount > 0` clause from isOutOfBounds would still pass
		// the rows-empty test above (because rows.length=0 alone would
		// fire). This test catches that specific regression.
		pageParamValue = 2
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 2, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
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

	it('renders the category multi-select filter (Phase 61 + 63)', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument()
	})

	it('renders the date-range filter (Phase 63)', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		expect(
			screen.getByLabelText(/filter by date range/i)
		).toBeInTheDocument()
	})

	it('passes valid URL categories to documentSearchQueries.list (Phase 63)', () => {
		categoriesParamValue = ['tax_return', 'insurance']
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
				| { categories?: unknown }
				| undefined
			expect(params?.categories).toEqual(['tax_return', 'insurance'])
		} finally {
			listSpy.mockRestore()
		}
	})

	it('passes valid URL from/to to documentSearchQueries.list (Phase 63)', () => {
		fromParamValue = '2026-02-01'
		toParamValue = '2026-02-28'
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		const listSpy = vi.spyOn(documentSearchQueries, 'list')
		try {
			renderVault()
			const params = listSpy.mock.calls.at(-1)?.[0] as
				| { from?: unknown; to?: unknown }
				| undefined
			expect(params?.from).toBe('2026-02-01')
			expect(params?.to).toBe('2026-02-28')
		} finally {
			listSpy.mockRestore()
		}
	})

	it('partially rejects URL categories — drops unknown values, keeps known (Phase 63)', () => {
		// `?categories=lease,banana,insurance` should keep lease + insurance,
		// drop banana, and scrub the URL to the cleaned set so the address
		// bar matches what's filtering.
		categoriesParamValue = ['lease', 'banana', 'insurance']
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		const listSpy = vi.spyOn(documentSearchQueries, 'list')
		try {
			renderVault()
			const params = listSpy.mock.calls.at(-1)?.[0] as
				| { categories?: unknown }
				| undefined
			expect(params?.categories).toEqual(['lease', 'insurance'])
			// URL scrubbed to the cleaned set.
			expect(mockSetCategoriesParam).toHaveBeenCalledWith(['lease', 'insurance'])
		} finally {
			listSpy.mockRestore()
		}
	})

	it('treats an entirely-unknown URL category set as "All categories" (Phase 63 H2 guard)', () => {
		// `?categories=banana,papaya` filters to nothing valid → no
		// `categories` param flows into the RPC, AND the URL is scrubbed
		// (set to null since the cleaned array is empty).
		categoriesParamValue = ['banana', 'papaya']
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		const listSpy = vi.spyOn(documentSearchQueries, 'list')
		try {
			renderVault()
			const params = listSpy.mock.calls.at(-1)?.[0] as
				| { categories?: unknown }
				| undefined
			expect(params).not.toHaveProperty('categories')
			expect(mockSetCategoriesParam).toHaveBeenCalledWith(null)
			expect(
				screen.getByText(/no documents uploaded yet/i)
			).toBeInTheDocument()
		} finally {
			listSpy.mockRestore()
		}
	})

	it('scrubs unparseable from/to dates from the URL (Phase 63 H2 guard)', () => {
		fromParamValue = 'not-a-date'
		toParamValue = '2026-13-99'
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		expect(mockSetFromParam).toHaveBeenCalledWith(null)
		expect(mockSetToParam).toHaveBeenCalledWith(null)
	})

	it('scrubs an unknown entity from the URL when the guard rejects it (cycle-1 P3-5)', () => {
		entityParamValue = 'banana'
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		expect(mockSetEntityParam).toHaveBeenCalledWith(null)
	})

	// Phase 65 cycle-1 I-3: while the categories hook is loading, the URL
	// guard MUST NOT scrub `?categories=…` slugs even if they look unknown.
	// Otherwise a user landing on a deeplink would see their filter cleared
	// before the per-owner taxonomy resolves.
	it('does NOT scrub URL category slugs while useDocumentCategories is loading', () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: true,
			isError: false
		})
		categoriesParamValue = ['lease', 'banana_unknown']
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		expect(mockSetCategoriesParam).not.toHaveBeenCalled()
	})

	// Phase 65 cycle-1 I-3 companion: once the hook lands with a known
	// owned set that DOESN'T include the URL slug, the scrub effect fires.
	it('scrubs unknown URL category slugs once owned set has loaded', async () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: SEVEN_DEFAULTS,
			isLoading: false,
			isError: false
		})
		categoriesParamValue = ['lease', 'banana_unknown']
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		// useEffect runs after render; waitFor lets the scrub commit.
		await waitFor(() => {
			expect(mockSetCategoriesParam).toHaveBeenCalledWith(['lease'])
		})
	})

	// Phase 64: bulk download as zip
	describe('bulk download (Phase 64)', () => {
		const originalFetch = global.fetch

		beforeEach(() => {
			// Mock fetch to return a real Response so we get type-correct
			// behavior (avoids `as unknown as Response`). jsdom ships the
			// Response constructor — body/blob()/json() all work.
			const blob = new Blob(['fake-zip'], { type: 'application/zip' })
			global.fetch = vi.fn().mockResolvedValue(new Response(blob))
		})

		// Restore jsdom's original fetch after this group runs. clearAllMocks
		// only resets call history, not the implementation we replaced.
		afterAll(() => {
			global.fetch = originalFetch
		})

		it('hides the Download all button when no docs match', () => {
			mockUseQuery.mockReturnValue({
				data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			expect(
				screen.queryByRole('button', { name: /download all/i })
			).not.toBeInTheDocument()
		})

		it('renders the Download all button with totalCount when matches exist', () => {
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 12, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			expect(
				screen.getByRole('button', { name: /download all \(12\)/i })
			).toBeInTheDocument()
		})

		it('disables the button when totalCount exceeds the 500-doc cap', () => {
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 501, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			expect(
				screen.getByRole('button', { name: /download all \(501\)/i })
			).toBeDisabled()
		})

		it('clicking the button POSTs the filter set with expanded date boundaries', async () => {
			const user = userEvent.setup()
			queryParamValue = 'tax'
			entityParamValue = 'lease'
			categoriesParamValue = ['lease', 'insurance']
			fromParamValue = '2026-01-01'
			toParamValue = '2026-12-31'
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 5, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			await user.click(screen.getByRole('button', { name: /download all \(5\)/i }))

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledTimes(1)
			})
			const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
			expect(fetchCall![0]).toMatch(/\/functions\/v1\/download-documents-zip$/)
			const init = fetchCall![1] as RequestInit
			expect(init.method).toBe('POST')
			expect(init.headers).toMatchObject({
				Authorization: 'Bearer test-token'
			})
			const body = JSON.parse(init.body as string) as Record<string, unknown>
			expect(body).toMatchObject({
				query: 'tax',
				entityType: 'lease',
				categories: ['lease', 'insurance']
			})
			// from/to MUST be expanded ISO timestamps so the Edge Function
			// queries the SAME row set the user just saw counted in the
			// UI. Don't pin the exact ISO value — `expandDateBoundary`
			// runs in the test runner's local zone, which CI may set to
			// anything. Round-tripping back to local YMD is the only
			// timezone-stable check.
			const fromIso = body['from'] as string
			const toIso = body['to'] as string
			const fromLocal = new Date(fromIso)
			const toLocal = new Date(toIso)
			expect(fromLocal.getFullYear()).toBe(2026)
			expect(fromLocal.getMonth()).toBe(0)
			expect(fromLocal.getDate()).toBe(1)
			expect(fromLocal.getHours()).toBe(0)
			expect(toLocal.getFullYear()).toBe(2026)
			expect(toLocal.getMonth()).toBe(11)
			expect(toLocal.getDate()).toBe(31)
			expect(toLocal.getHours()).toBe(23)
		})

		it('shows a toast when the Edge Function returns an error', async () => {
			const user = userEvent.setup()
			global.fetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						error: 'Filter matches 600 documents; cap is 500.'
					}),
					{
						status: 413,
						statusText: 'Payload Too Large',
						headers: { 'Content-Type': 'application/json' }
					}
				)
			)
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 5, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			await user.click(screen.getByRole('button', { name: /download all/i }))
			await waitFor(() => {
				expect(mockToastError).toHaveBeenCalledWith(
					expect.stringMatching(/cap is 500/i)
				)
			})
		})

		it('double-click guard prevents two concurrent fetches', async () => {
			// Hold the fetch promise open so both clicks land BEFORE the
			// first call resolves (and BEFORE setIsDownloading commits).
			// Without the ref-based guard, the closures would both see
			// isDownloading === false and fire two POSTs.
			let resolveFetch!: (value: Response) => void
			const pendingResponse = new Promise<Response>(r => {
				resolveFetch = r
			})
			global.fetch = vi.fn().mockReturnValue(pendingResponse)
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 5, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			const button = screen.getByRole('button', { name: /download all \(5\)/i })
			// fireEvent dispatches synchronously; both clicks happen before
			// any microtask flushes, so the second click sees the same
			// closure as the first.
			fireEvent.click(button)
			fireEvent.click(button)

			// Resolve fetch so the in-flight call finishes — otherwise
			// the test hangs on the await inside handleBulkDownload.
			act(() => {
				resolveFetch(
					new Response(new Blob(['fake-zip'], { type: 'application/zip' }))
				)
			})

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledTimes(1)
			})
		})

		it('shows an auth-required toast when getSession returns no token', async () => {
			const user = userEvent.setup()
			mockGetSession.mockResolvedValue({ data: { session: null } })
			mockUseQuery.mockReturnValue({
				data: { rows: [{ id: 'a' }], totalCount: 5, page: 0, pageSize: 50 },
				isLoading: false,
				isFetching: false,
				isError: false
			})
			renderVault()
			await user.click(screen.getByRole('button', { name: /download all/i }))
			await waitFor(() => {
				expect(mockToastError).toHaveBeenCalledWith(
					expect.stringMatching(/sign in/i)
				)
			})
			// fetch must not be invoked when there's no session token.
			expect(global.fetch).not.toHaveBeenCalled()
		})
	})
})

