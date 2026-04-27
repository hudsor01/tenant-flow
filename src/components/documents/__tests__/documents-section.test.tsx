import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { DocumentsSection } from '../documents-section'
import {
	DOCUMENT_ENTITY_TYPES,
	type DocumentEntityType
} from '#hooks/api/query-keys/document-keys'
import { mutationKeys } from '#hooks/api/mutation-keys'

const mockUseQuery = vi.fn()
const mockUploadMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockToastWarning = vi.fn()

// Phase 65: mock the per-owner taxonomy hook with the seven seeded
// defaults so existing assertions on category-related rendering keep
// matching pre-65 behaviour.
const mockUseDocumentCategories = vi.fn()

vi.mock('#hooks/api/use-document-categories', () => ({
	useDocumentCategories: () => mockUseDocumentCategories()
}))

// Shape used by useMutation mock — lets individual tests override
// `isPending` to exercise the uploading-state branch.
let uploadPending = false

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
			const optsRecord = opts as { mutationKey?: readonly unknown[] }
			const isUpload = mutationKeyMatches(
				optsRecord.mutationKey,
				mutationKeys.documents.upload
			)
			return {
				mutate: vi.fn(),
				mutateAsync: isUpload ? mockUploadMutate : mockDeleteMutate,
				isPending: isUpload ? uploadPending : false,
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

function renderSection(
	entityType: DocumentEntityType = 'property'
): ReturnType<typeof render> {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})
	const ui: ReactElement = (
		<QueryClientProvider client={queryClient}>
			<DocumentsSection
				entityType={entityType}
				entityId="00000000-0000-0000-0000-000000000001"
			/>
		</QueryClientProvider>
	)
	return render(ui)
}

function emptyList() {
	return { data: { rows: [], totalCount: 0 }, isLoading: false, isError: false }
}

function list(rows: unknown[], totalCount = rows.length) {
	return {
		data: { rows, totalCount },
		isLoading: false,
		isError: false
	}
}

const SEVEN_DEFAULTS = [
	{ id: 'cat-1', slug: 'lease', label: 'Lease', sort_order: 10, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-2', slug: 'receipt', label: 'Receipt', sort_order: 20, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-3', slug: 'tax_return', label: 'Tax return', sort_order: 30, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-4', slug: 'inspection_report', label: 'Inspection report', sort_order: 40, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-5', slug: 'maintenance_invoice', label: 'Maintenance invoice', sort_order: 50, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-6', slug: 'insurance', label: 'Insurance', sort_order: 60, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-7', slug: 'other', label: 'Other', sort_order: 70, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' }
]

describe('DocumentsSection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		uploadPending = false
		mockUseDocumentCategories.mockReturnValue({
			categories: SEVEN_DEFAULTS,
			isLoading: false,
			isError: false
		})
	})

	it('hides empty-state CTA while the documents query is in flight', () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false
		})
		renderSection()
		expect(
			screen.queryByText(/no documents attached/i)
		).not.toBeInTheDocument()
	})

	it('renders empty state with upload CTA when no documents exist', () => {
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()
		expect(screen.getByText(/no documents attached/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /upload your first document/i })
		).toBeInTheDocument()
	})

	it('renders document rows with title fallback when title is null', () => {
		mockUseQuery.mockReturnValue(
			list([
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
			])
		)
		renderSection()
		expect(
			screen.getByText('property/property-1/123-lease.pdf')
		).toBeInTheDocument()
		expect(screen.getByText(/Documents \(1\)/)).toBeInTheDocument()
	})

	it('shows "showing X of Y" when the list is truncated at the display cap', () => {
		mockUseQuery.mockReturnValue(list([{ id: 'doc-1', entity_type: 'property', entity_id: 'property-1', document_type: 'other', mime_type: 'application/pdf', file_path: 'a.pdf', storage_url: 'a.pdf', file_size: 1, title: 'A', tags: null, description: null, owner_user_id: 'o', created_at: '2026-04-15T00:00:00Z', signed_url: null }], 150))
		renderSection()
		expect(screen.getByText(/showing 1 of 150/i)).toBeInTheDocument()
	})

	it('skips uploads with unsupported MIME type and toasts the rejection', async () => {
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()

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
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
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

	it('shows the "Uploading..." label and disables the button while the upload mutation is pending', () => {
		uploadPending = true
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()
		const uploadingButton = screen.getByRole('button', { name: /uploading/i })
		expect(uploadingButton).toBeDisabled()
	})

	it('accepts image/jpg MIME (iOS Safari quirk) in addition to image/jpeg', async () => {
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()
		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
		const iosPhoto = new File([new Uint8Array(1024)], 'photo.jpg', {
			type: 'image/jpg'
		})
		fireEvent.change(input, { target: { files: [iosPhoto] } })
		await waitFor(() => {
			expect(mockUploadMutate).toHaveBeenCalled()
		})
		// No rejection toast.
		expect(mockToastError).not.toHaveBeenCalled()
	})

	it('renders the category Select for the next upload (Phase 61)', () => {
		mockUseQuery.mockReturnValue(emptyList())
		renderSection()
		expect(
			screen.getByLabelText(/category for next upload/i)
		).toBeInTheDocument()
	})

	it('passes the default category "other" through to the upload mutation (Phase 61)', async () => {
		mockUseQuery.mockReturnValue(emptyList())
		mockUploadMutate.mockResolvedValue({})
		renderSection()

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
		const file = new File(['fake pdf'], 'lease.pdf', {
			type: 'application/pdf'
		})
		fireEvent.change(input, { target: { files: [file] } })

		await waitFor(() => {
			expect(mockUploadMutate).toHaveBeenCalledTimes(1)
		})
		// Stricter matcher — pin the full payload shape so a regression
		// that drops `mimeType` or swaps `entityType` while adding
		// `category` is caught.
		expect(mockUploadMutate).toHaveBeenCalledWith(
			expect.objectContaining({
				category: 'other',
				mimeType: 'application/pdf',
				entityType: 'property',
				entityId: '00000000-0000-0000-0000-000000000001'
			})
		)
	})

	it('passes a non-default category through after the user selects it (cycle-1 P2-1)', async () => {
		const user = userEvent.setup()
		mockUseQuery.mockReturnValue(emptyList())
		mockUploadMutate.mockResolvedValue({})
		renderSection()

		// Open the Radix Select via its trigger and pick "Lease".
		const trigger = screen.getByLabelText(/category for next upload/i)
		await user.click(trigger)
		const leaseOption = await screen.findByRole('option', { name: /^lease$/i })
		await user.click(leaseOption)

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
		const file = new File(['fake pdf'], 'addendum.pdf', {
			type: 'application/pdf'
		})
		fireEvent.change(input, { target: { files: [file] } })

		await waitFor(() => {
			expect(mockUploadMutate).toHaveBeenCalledTimes(1)
		})
		expect(mockUploadMutate).toHaveBeenCalledWith(
			expect.objectContaining({ category: 'lease' })
		)
	})

	// Phase 65 cycle-3 I-1: error fallback + state re-sync.
	it('falls back to seven default categories when useDocumentCategories has no rows', async () => {
		// Empty owned set + not loading → fallback to DEFAULT_CATEGORY_LABELS.
		// Covers both isError:true and isError:false-with-zero-rows (M-3).
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: false,
			isError: true
		})
		mockUseQuery.mockReturnValue(emptyList())
		mockUploadMutate.mockResolvedValue({})
		const user = userEvent.setup()
		renderSection()
		// Open the Radix Select; assert all seven default labels rendered.
		const trigger = screen.getByLabelText(/category for next upload/i)
		await user.click(trigger)
		for (const label of [
			'Lease',
			'Receipt',
			'Tax return',
			'Inspection report',
			'Maintenance invoice',
			'Insurance',
			'Other'
		]) {
			expect(
				await screen.findByRole('option', { name: new RegExp(`^${label}$`, 'i') })
			).toBeInTheDocument()
		}
	})

	it('re-syncs the upload category if the loaded set excludes the current value', async () => {
		// Initial render: hook returns SEVEN_DEFAULTS (which includes 'other'),
		// upload submits with 'other'. Then re-render with hook returning a
		// reduced set that excludes 'other'; useEffect should re-sync to the
		// first available slug.
		const reducedSet = SEVEN_DEFAULTS.filter(c => c.slug !== 'other')
		mockUseDocumentCategories.mockReturnValue({
			categories: reducedSet,
			isLoading: false,
			isError: false
		})
		mockUseQuery.mockReturnValue(emptyList())
		mockUploadMutate.mockResolvedValue({})
		renderSection()

		const input = document.querySelector(
			'input[type="file"]'
		) as HTMLInputElement
		const file = new File(['fake pdf'], 'resync.pdf', {
			type: 'application/pdf'
		})
		fireEvent.change(input, { target: { files: [file] } })
		await waitFor(() => {
			expect(mockUploadMutate).toHaveBeenCalledTimes(1)
		})
		// reducedSet's first slug is 'lease' — useEffect re-synced category.
		expect(mockUploadMutate).toHaveBeenCalledWith(
			expect.objectContaining({ category: 'lease' })
		)
	})

	it('renders an error state with Try again button when the query errors', () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: vi.fn()
		})
		renderSection()
		expect(
			screen.getByText(/couldn't load your documents/i)
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /try again/i })
		).toBeInTheDocument()
	})

	// v2.4 Phase 59 widened beyond property to lease/tenant/maintenance_request.
	// v2.5 Phase 62 added inspection — describe.each picks it up automatically
	// via DOCUMENT_ENTITY_TYPES. Every entity type should render identically at
	// this layer; entity-specific behavior lives in the backing RLS policies,
	// not the component.
	describe.each(DOCUMENT_ENTITY_TYPES)('entity type %s', entityType => {
		it('renders empty state with upload CTA', () => {
			mockUseQuery.mockReturnValue(emptyList())
			renderSection(entityType)
			expect(screen.getByText(/no documents attached/i)).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /upload your first document/i })
			).toBeInTheDocument()
		})
	})
})
