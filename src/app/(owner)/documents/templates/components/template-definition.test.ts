/**
 * Template Definition Hook Tests
 *
 * Tests for useTemplateDefinition covering:
 * - Load from PostgREST on mount (populates customFields)
 * - Empty array when no definition exists
 * - Save via upsert with correct shape
 * - Success/error toasts
 * - isSaving state management
 * - Form field defaults for loaded custom fields
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() for mock variables (project convention)
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockMaybeSingle,
	mockUpsert,
	mockGetUser
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockMaybeSingle: vi.fn(),
	mockUpsert: vi.fn(),
	mockGetUser: vi.fn()
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: mockFrom
	})
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: mockGetUser
}))

vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: vi.fn((_error: unknown, _domain: string) => {
		throw new Error('PostgREST error')
	})
}))

// Mock sonner toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args),
		info: vi.fn()
	}
}))

// Mock TanStack Query - provide real-ish wrapper
const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return {
		...actual,
		useQueryClient: () => ({
			invalidateQueries: mockInvalidateQueries
		})
	}
})

import { useTemplateDefinition } from './template-definition'
import type { DynamicField } from './dynamic-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

const TEST_USER_ID = 'user-123-abc'

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 }
		}
	})
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

const baseFields: DynamicField[] = [
	{ name: 'description', label: 'Description', type: 'textarea' }
]

function setupSelectChain(result: { data: unknown; error: unknown }) {
	const chain = {
		select: mockSelect.mockReturnThis(),
		eq: mockEq.mockReturnThis(),
		maybeSingle: mockMaybeSingle.mockResolvedValue(result)
	}
	mockFrom.mockReturnValue(chain)
	return chain
}

describe('useTemplateDefinition', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetUser.mockResolvedValue({ id: TEST_USER_ID })
	})

	// =========================================================================
	// Load behavior
	// =========================================================================
	describe('load', () => {
		it('fetches custom fields from PostgREST on mount and populates customFields', async () => {
			const savedFields: DynamicField[] = [
				{ name: 'custom_notes', label: 'Custom Notes', type: 'text' }
			]
			setupSelectChain({
				data: { custom_fields: savedFields },
				error: null
			})

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			expect(result.current.customFields).toEqual(savedFields)
			expect(mockFrom).toHaveBeenCalledWith('document_template_definitions')
		})

		it('returns empty array when no definition exists (maybeSingle returns null)', async () => {
			setupSelectChain({ data: null, error: null })

			const { result } = renderHook(
				() => useTemplateDefinition('lease', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			expect(result.current.customFields).toEqual([])
		})

		it('sets isLoading to false after fetch completes', async () => {
			setupSelectChain({ data: null, error: null })

			const { result } = renderHook(
				() => useTemplateDefinition('lease', baseFields),
				{ wrapper: createWrapper() }
			)

			// Initially loading
			expect(result.current.isLoading).toBe(true)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})
		})

		it('includes base fields and custom fields in fields array', async () => {
			const savedFields: DynamicField[] = [
				{ name: 'extra', label: 'Extra', type: 'text' }
			]
			setupSelectChain({
				data: { custom_fields: savedFields },
				error: null
			})

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			expect(result.current.fields).toHaveLength(2) // 1 base + 1 custom
			expect(result.current.fields[0]?.name).toBe('description')
			expect(result.current.fields[1]?.name).toBe('extra')
		})
	})

	// =========================================================================
	// Save behavior
	// =========================================================================
	describe('save', () => {
		it('calls PostgREST upsert with owner_user_id, template_key, custom_fields', async () => {
			setupSelectChain({ data: null, error: null })
			mockUpsert.mockResolvedValue({ data: null, error: null })

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			// Set custom fields before saving
			act(() => {
				result.current.setCustomFields([
					{ name: 'custom1', label: 'Custom 1', type: 'text' }
				])
			})

			// Setup mock for save (upsert)
			mockFrom.mockReturnValue({ upsert: mockUpsert })

			await act(async () => {
				await result.current.save()
			})

			expect(mockFrom).toHaveBeenCalledWith('document_template_definitions')
			expect(mockUpsert).toHaveBeenCalledWith(
				{
					owner_user_id: TEST_USER_ID,
					template_key: 'maintenance-request',
					custom_fields: [{ name: 'custom1', label: 'Custom 1', type: 'text' }]
				},
				{ onConflict: 'owner_user_id,template_key' }
			)
		})

		it('shows success toast on completion', async () => {
			setupSelectChain({ data: null, error: null })
			mockUpsert.mockResolvedValue({ data: null, error: null })

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			mockFrom.mockReturnValue({ upsert: mockUpsert })

			await act(async () => {
				await result.current.save()
			})

			expect(mockToastSuccess).toHaveBeenCalledWith(
				'Template definition saved'
			)
		})

		it('shows error toast on failure', async () => {
			setupSelectChain({ data: null, error: null })
			mockUpsert.mockResolvedValue({
				data: null,
				error: { message: 'DB error', code: '42000', details: '', hint: '' }
			})

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			mockFrom.mockReturnValue({ upsert: mockUpsert })

			await act(async () => {
				await result.current.save()
			})

			expect(mockToastError).toHaveBeenCalledWith(
				'Failed to save template definition'
			)
		})

		it('sets isSaving during operation and resets after', async () => {
			setupSelectChain({ data: null, error: null })

			let resolveUpsert: (v: unknown) => void
			const upsertPromise = new Promise(r => {
				resolveUpsert = r
			})
			mockUpsert.mockReturnValue(upsertPromise)

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			mockFrom.mockReturnValue({ upsert: mockUpsert })

			expect(result.current.isSaving).toBe(false)

			let savePromise: Promise<void>
			act(() => {
				savePromise = result.current.save()
			})

			await waitFor(() => {
				expect(result.current.isSaving).toBe(true)
			})

			await act(async () => {
				resolveUpsert!({ data: null, error: null })
				await savePromise!
			})

			expect(result.current.isSaving).toBe(false)
		})

		it('invalidates query cache after successful save', async () => {
			setupSelectChain({ data: null, error: null })
			mockUpsert.mockResolvedValue({ data: null, error: null })

			const { result } = renderHook(
				() => useTemplateDefinition('maintenance-request', baseFields),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			mockFrom.mockReturnValue({ upsert: mockUpsert })

			await act(async () => {
				await result.current.save()
			})

			expect(mockInvalidateQueries).toHaveBeenCalledWith({
				queryKey: ['document-template-definitions']
			})
		})
	})

	// =========================================================================
	// Form defaults
	// =========================================================================
	describe('form field defaults', () => {
		it('sets default values for loaded custom fields on form', async () => {
			const savedFields: DynamicField[] = [
				{ name: 'notes', label: 'Notes', type: 'text' },
				{
					name: 'priority',
					label: 'Priority',
					type: 'select',
					options: [
						{ value: 'low', label: 'Low' },
						{ value: 'high', label: 'High' }
					]
				},
				{ name: 'urgent', label: 'Urgent', type: 'checkbox' }
			]
			setupSelectChain({
				data: { custom_fields: savedFields },
				error: null
			})

			const mockSetFieldValue = vi.fn()
			const mockForm = {
				setFieldValue: mockSetFieldValue,
				state: { values: {} as Record<string, unknown> }
			}

			renderHook(
				() =>
					useTemplateDefinition(
						'maintenance-request',
						baseFields,
						mockForm
					),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(mockSetFieldValue).toHaveBeenCalled()
			})

			// Text defaults to ''
			expect(mockSetFieldValue).toHaveBeenCalledWith('notes', '')
			// Select defaults to first option value
			expect(mockSetFieldValue).toHaveBeenCalledWith('priority', 'low')
			// Checkbox defaults to false
			expect(mockSetFieldValue).toHaveBeenCalledWith('urgent', false)
		})
	})
})
