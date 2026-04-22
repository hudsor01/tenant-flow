import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsSection } from '../documents-section'
import { mutationKeys } from '#hooks/api/mutation-keys'

const mockUseQuery = vi.fn()
const mockUploadMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockToastWarning = vi.fn()

function mutationKeyMatches(
	actual: readonly unknown[] | undefined,
	expected: readonly unknown[]
): boolean {
	if (!actual) return false
	if (actual.length !== expected.length) return false
	return actual.every((v, i) => v === expected[i])
}

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return {
		...actual,
		useQuery: () => mockUseQuery(),
		useMutation: (opts: { mutationFn?: unknown }) => {
			// Compare against the real mutationKey constant from
			// mutation-keys.ts so future key reshuffling fails the test
			// instead of silently routing to the wrong mock.
			const optsRecord = opts as { mutationKey?: readonly unknown[] }
			const isUpload = mutationKeyMatches(
				optsRecord.mutationKey,
				mutationKeys.documents.upload
			)
			return {
				mutate: vi.fn(),
				mutateAsync: isUpload ? mockUploadMutate : mockDeleteMutate,
				isPending: false,
				isError: false,
				isSuccess: false
			}
		}
	}
})

vi.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args),
		warning: (...args: unknown[]) => mockToastWarning(...args)
	}
}))

function renderSection(): ReturnType<typeof render> {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})
	const ui: ReactElement = (
		<QueryClientProvider client={queryClient}>
			<DocumentsSection entityType="property" entityId="property-1" />
		</QueryClientProvider>
	)
	return render(ui)
}

describe('DocumentsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('hides empty-state CTA while the documents query is in flight', () => {
		mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })
		renderSection()
		// During loading the empty-state CTA must not render — it should be
		// either skeletons or the populated list, never the upload prompt.
		expect(
			screen.queryByText(/no documents attached/i)
		).not.toBeInTheDocument()
	})

	it('renders empty state with upload CTA when no documents exist', () => {
		mockUseQuery.mockReturnValue({ data: [], isLoading: false })
		renderSection()
		expect(screen.getByText(/no documents attached/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /upload your first document/i })
		).toBeInTheDocument()
	})

	it('renders document rows with title fallback when title is null', () => {
		mockUseQuery.mockReturnValue({
			data: [
				{
					id: 'doc-1',
					entity_type: 'property',
					entity_id: 'property-1',
					document_type: 'other',
					mime_type: 'application/pdf',
					file_path: 'property/property-1/123-lease.pdf',
					storage_url: 'property/property-1/123-lease.pdf',
					file_size: 524288,
					title: null,
					tags: null,
					description: null,
					owner_user_id: 'owner-1',
					created_at: '2026-04-15T00:00:00Z',
					signed_url: 'https://example.com/signed/lease.pdf'
				}
			],
			isLoading: false
		})
		renderSection()
		// Falls back to file_path when title is null
		expect(
			screen.getByText('property/property-1/123-lease.pdf')
		).toBeInTheDocument()
		// Header shows count
		expect(screen.getByText(/Documents \(1\)/)).toBeInTheDocument()
	})

	it('skips uploads with unsupported MIME type and toasts the rejection', async () => {
		mockUseQuery.mockReturnValue({ data: [], isLoading: false })
		renderSection()

		// userEvent.upload respects the input's accept attribute and silently
		// drops files that don't match. Use fireEvent so the change handler
		// receives the bad file and runs its own MIME validation — that's
		// what we're testing.
		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
		const badFile = new File(['fake exe content'], 'malware.exe', {
			type: 'application/x-msdownload'
		})
		fireEvent.change(input, { target: { files: [badFile] } })

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalled()
		})
		expect(mockUploadMutate).not.toHaveBeenCalled()
	})

	it('skips uploads exceeding the 10 MB cap', async () => {
		mockUseQuery.mockReturnValue({ data: [], isLoading: false })
		renderSection()

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement

		// 11 MB blob with an allowed MIME — only the size check should reject.
		const tooLarge = new File(
			[new Uint8Array(11 * 1024 * 1024)],
			'huge.pdf',
			{ type: 'application/pdf' }
		)
		fireEvent.change(input, { target: { files: [tooLarge] } })

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				expect.stringMatching(/skipped 1 file/i),
				expect.objectContaining({
					description: expect.stringMatching(/exceeds 10 MB/i)
				})
			)
		})
		expect(mockUploadMutate).not.toHaveBeenCalled()
	})
})
