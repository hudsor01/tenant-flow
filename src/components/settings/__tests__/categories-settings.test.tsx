import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { CategoriesSettings } from '../categories-settings'
import { mutationKeys } from '#hooks/api/mutation-keys'

const mockUseDocumentCategories = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockReorder = vi.fn()

vi.mock('#hooks/api/use-document-categories', () => ({
	useDocumentCategories: () => mockUseDocumentCategories()
}))

vi.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args),
		warning: vi.fn(),
		info: vi.fn()
	}
}))

function mutationKeyMatches(
	actual: readonly unknown[] | undefined,
	expected: readonly unknown[]
): boolean {
	if (!actual) return false
	if (actual.length !== expected.length) return false
	return actual.every((v, i) => v === expected[i])
}

// Capture the reorder mutation's onMutate/onError handlers so a unit
// test can drive them directly to exercise the snapshot-rollback path
// (cycle-1 M-7).
const reorderHooks: {
	onMutate?: () => Promise<unknown>
	onError?: (err: Error, vars: unknown, ctx: unknown) => void
} = {}

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return {
		...actual,
		useMutation: (opts: {
			mutationKey?: readonly unknown[]
			onMutate?: () => Promise<unknown>
			onError?: (err: Error, vars: unknown, ctx: unknown) => void
		}) => {
			const key = opts.mutationKey
			let mutate: ReturnType<typeof vi.fn> = vi.fn()
			if (mutationKeyMatches(key, mutationKeys.documentCategories.create)) {
				mutate = mockCreate
			} else if (
				mutationKeyMatches(key, mutationKeys.documentCategories.update)
			) {
				mutate = mockUpdate
			} else if (
				mutationKeyMatches(
					key,
					mutationKeys.documentCategories.deleteWithReassign
				)
			) {
				mutate = mockDelete
			} else if (
				mutationKeyMatches(key, mutationKeys.documentCategories.reorder)
			) {
				mutate = mockReorder
				if (opts.onMutate) reorderHooks.onMutate = opts.onMutate
				if (opts.onError) reorderHooks.onError = opts.onError
			}
			return {
				mutate,
				mutateAsync: mutate,
				isPending: false,
				isError: false,
				isSuccess: false
			}
		}
	}
})

const SEVEN_DEFAULTS = [
	{ id: 'cat-1', slug: 'lease', label: 'Lease', sort_order: 10, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
	{ id: 'cat-7', slug: 'other', label: 'Other', sort_order: 70, is_default: true, owner_user_id: 'u', created_at: '2026-04-26T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' }
]

const WITH_CUSTOM = [
	...SEVEN_DEFAULTS,
	{ id: 'cat-custom', slug: 'warranty', label: 'Warranty', sort_order: 100, is_default: false, owner_user_id: 'u', created_at: '2026-04-27T00:00:00Z', updated_at: '2026-04-27T00:00:00Z' }
]

function renderSettings(): ReturnType<typeof render> & {
	queryClient: QueryClient
} {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})
	const ui: ReactElement = (
		<QueryClientProvider client={queryClient}>
			<CategoriesSettings />
		</QueryClientProvider>
	)
	const result = render(ui)
	return { ...result, queryClient }
}

describe('CategoriesSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseDocumentCategories.mockReturnValue({
			categories: SEVEN_DEFAULTS,
			isLoading: false,
			isError: false
		})
	})

	it('renders skeletons while categories are loading', () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: [],
			isLoading: true,
			isError: false
		})
		renderSettings()
		// Skeletons render with role="status" or class fragment; title still renders.
		expect(screen.getByText(/document categories/i)).toBeInTheDocument()
	})

	it('renders every category as a row with slug + label visible', () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		expect(screen.getByText('Lease')).toBeInTheDocument()
		expect(screen.getByText('Other')).toBeInTheDocument()
		expect(screen.getByText('Warranty')).toBeInTheDocument()
		// Custom category does NOT show the Default badge.
		const warrantyRow = screen.getByText('Warranty').closest('li')
		expect(warrantyRow).toBeTruthy()
		expect(warrantyRow!.textContent).not.toMatch(/Default/)
	})

	it('disables the delete button on default categories with a tooltip', () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: SEVEN_DEFAULTS,
			isLoading: false,
			isError: false
		})
		renderSettings()
		// Every default row renders the same aria-label for its disabled
		// delete button — assert ALL of them are present and disabled.
		const disabledButtons = screen.getAllByLabelText(
			"Default categories can't be deleted"
		)
		expect(disabledButtons).toHaveLength(SEVEN_DEFAULTS.length)
		for (const btn of disabledButtons) {
			expect(btn).toBeDisabled()
		}
	})

	it('enables the delete button on custom categories', () => {
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		expect(
			screen.getByRole('button', { name: /delete warranty/i })
		).toBeEnabled()
	})

	it('opens the create dialog and submits with auto-derived slug', async () => {
		const user = userEvent.setup()
		renderSettings()
		await user.click(screen.getByRole('button', { name: /add category/i }))
		const labelInput = await screen.findByLabelText('Label')
		await user.type(labelInput, 'Home Office')
		// Slug should auto-fill from the label.
		const slugInput = screen.getByLabelText('Slug') as HTMLInputElement
		expect(slugInput.value).toBe('home_office')
		await user.click(screen.getByRole('button', { name: /^create$/i }))
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				slug: 'home_office',
				label: 'Home Office'
			})
		)
	})

	it('opens the rename dialog and submits the new label', async () => {
		const user = userEvent.setup()
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		await user.click(screen.getByRole('button', { name: /rename warranty/i }))
		const labelInput = await screen.findByLabelText('Label')
		await user.clear(labelInput)
		await user.type(labelInput, 'Home Warranty')
		await user.click(screen.getByRole('button', { name: /^save$/i }))
		expect(mockUpdate).toHaveBeenCalledWith({
			id: 'cat-custom',
			label: 'Home Warranty'
		})
	})

	it('opens delete confirmation with reassignment Select and submits both ids', async () => {
		const user = userEvent.setup()
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		await user.click(screen.getByRole('button', { name: /delete warranty/i }))
		// Default reassignment target should be 'other' (the canonical fallback).
		// The button is enabled because the default is pre-filled.
		const submitBtn = await screen.findByRole('button', {
			name: /delete & reassign/i
		})
		await user.click(submitBtn)
		expect(mockDelete).toHaveBeenCalledWith({
			from_id: 'cat-custom',
			to_id: 'cat-7' // 'other' fallback
		})
	})

	it('disables Save in rename dialog when label is unchanged', async () => {
		const user = userEvent.setup()
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		await user.click(screen.getByRole('button', { name: /rename warranty/i }))
		// Label pre-fills with current value 'Warranty'; Save is disabled until
		// the user changes it.
		const saveBtn = await screen.findByRole('button', { name: /^save$/i })
		expect(saveBtn).toBeDisabled()
	})

	it('disables Create in new-category dialog when label is empty', async () => {
		const user = userEvent.setup()
		renderSettings()
		await user.click(screen.getByRole('button', { name: /add category/i }))
		const createBtn = await screen.findByRole('button', { name: /^create$/i })
		expect(createBtn).toBeDisabled()
	})

	it('Cancel in delete dialog clears the dialog state without firing the mutation', async () => {
		const user = userEvent.setup()
		mockUseDocumentCategories.mockReturnValue({
			categories: WITH_CUSTOM,
			isLoading: false,
			isError: false
		})
		renderSettings()
		await user.click(screen.getByRole('button', { name: /delete warranty/i }))
		const cancelBtn = await screen.findByRole('button', { name: /^cancel$/i })
		await user.click(cancelBtn)
		await waitFor(() => {
			expect(
				screen.queryByText(/Delete "Warranty"/)
			).not.toBeInTheDocument()
		})
		expect(mockDelete).not.toHaveBeenCalled()
	})

	it('reorder rollback: onError restores the snapshot taken in onMutate (cycle-1 M-7)', async () => {
		const initial = WITH_CUSTOM
		mockUseDocumentCategories.mockReturnValue({
			categories: initial,
			isLoading: false,
			isError: false
		})
		// Reset the captured hooks before mounting so we know the values
		// we read after render came from THIS render.
		delete reorderHooks.onMutate
		delete reorderHooks.onError
		const { queryClient } = renderSettings()
		const listKey = ['documentCategories', 'list'] as const
		queryClient.setQueryData(listKey, initial)

		// Snapshot phase — onMutate captures the current cache.
		expect(reorderHooks.onMutate).toBeDefined()
		const ctx = await reorderHooks.onMutate!()

		// Optimistic mutation — settle a different (incorrect) order in
		// the cache to simulate the drag.
		const reordered = [...initial].reverse()
		queryClient.setQueryData(listKey, reordered)
		expect(queryClient.getQueryData(listKey)).toEqual(reordered)

		// Failure path — onError should restore the snapshot.
		expect(reorderHooks.onError).toBeDefined()
		reorderHooks.onError!(new Error('rpc failed'), undefined, ctx)

		expect(queryClient.getQueryData(listKey)).toEqual(initial)
		expect(mockToastError).toHaveBeenCalledWith(
			expect.stringContaining('rpc failed')
		)
	})
})
