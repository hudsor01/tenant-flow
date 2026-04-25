import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsVaultClient } from '../documents-vault.client'

const mockUseQuery = vi.fn()
const mockSetQueryParam = vi.fn()
const mockSetEntityParam = vi.fn()
const mockSetPageParam = vi.fn()

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
			if (key === 'q') return ['', mockSetQueryParam]
			if (key === 'entity') return ['__any__', mockSetEntityParam]
			if (key === 'page') return [0, mockSetPageParam]
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
		// each renders with the `animate-pulse` class from skeletonVariants.
		expect(container.querySelectorAll('.animate-pulse').length).toBe(5)
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
})
