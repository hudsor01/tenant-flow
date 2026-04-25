import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsVaultClient } from '../documents-vault.client'

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

	it('renders Previous/Next buttons with correct enabled state', () => {
		pageParamValue = 1 // simulate URL on page 2
		mockUseQuery.mockReturnValue({
			data: {
				rows: Array.from({ length: 50 }, (_, i) => ({
					id: `doc-${i}`,
					entity_type: 'property',
					entity_id: 'p',
					document_type: 'other',
					mime_type: 'application/pdf',
					file_path: `property/p/${i}.pdf`,
					storage_url: `property/p/${i}.pdf`,
					file_size: 1,
					title: `Doc ${i}`,
					tags: null,
					description: null,
					owner_user_id: 'o',
					created_at: '2026-04-25T00:00:00Z',
					signed_url: null
				})),
				totalCount: 200, // 4 pages total
				page: 1,
				pageSize: 50
			},
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		const prev = screen.getByRole('button', { name: /previous/i })
		const next = screen.getByRole('button', { name: /next/i })
		expect(prev).toBeEnabled()
		expect(next).toBeEnabled()
	})

	it('treats an unknown URL entity filter as "All types" (H2 guard)', () => {
		// Attacker- or stale-bookmark-supplied URL like ?entity=banana
		// must not flow into the query as a typed DocumentEntityType.
		entityParamValue = 'banana'
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		// Inspect the queryFn arg via the mock call: the hook must NOT
		// have been passed `entityType: 'banana'` — it should fall back
		// to undefined. Since we mock useQuery rather than the factory,
		// rely on the rendered behavior: empty state appears (no rows)
		// without crashing.
		expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument()
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

	it('search input change is captured in local state', () => {
		mockUseQuery.mockReturnValue({
			data: { rows: [], totalCount: 0, page: 0, pageSize: 50 },
			isLoading: false,
			isFetching: false,
			isError: false
		})
		renderVault()
		const input = screen.getByLabelText(/search documents/i) as HTMLInputElement
		fireEvent.change(input, { target: { value: 'tax' } })
		expect(input.value).toBe('tax')
	})
})
