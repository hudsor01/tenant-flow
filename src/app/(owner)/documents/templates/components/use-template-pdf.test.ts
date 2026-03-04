/**
 * Tests for useTemplatePdf hook
 *
 * PDF preview and export are not yet implemented (Edge Function pending).
 * These tests validate the graceful "not available" behavior:
 * - handlePreview debounces, then shows an info toast
 * - handleExport sets isExporting, then shows an info toast
 * - Cleanup revokes blob URLs and clears debounce timers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTemplatePdf } from './use-template-pdf'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}))

/** Debounce delay in the hook - must match PREVIEW_DEBOUNCE_MS */
const DEBOUNCE_DELAY = 500

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(URL, 'createObjectURL', {
	value: mockCreateObjectURL,
	writable: true
})
Object.defineProperty(URL, 'revokeObjectURL', {
	value: mockRevokeObjectURL,
	writable: true
})

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true
})

describe('useTemplatePdf', () => {
	const mockTemplate = 'property-inspection'
	const mockPayload = {
		templateTitle: 'Test Template',
		branding: { companyName: 'Test Company', logoUrl: null, primaryColor: 'steelblue' },
		customFields: [],
		clauses: [],
		data: {}
	}
	const mockGetPayload = vi.fn(() => mockPayload)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	describe('initial state', () => {
		it('should return initial state with null previewUrl', () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			expect(result.current.previewUrl).toBeNull()
			expect(result.current.isGeneratingPreview).toBe(false)
			expect(result.current.isExporting).toBe(false)
		})

		it('should provide handlePreview and handleExport functions', () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			expect(typeof result.current.handlePreview).toBe('function')
			expect(typeof result.current.handleExport).toBe('function')
		})
	})

	describe('handlePreview', () => {
		it('should debounce preview calls', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			// Call preview - should not immediately trigger info toast (debounced)
			await act(async () => {
				result.current.handlePreview()
			})

			expect(toast.info).not.toHaveBeenCalled()

			// Advance timer past debounce delay
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve() // flush microtasks
			})

			// After debounce fires, the info toast should appear
			expect(toast.info).toHaveBeenCalled()
		})

		it('should cancel previous debounced call when called again', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			// Call preview twice in quick succession
			await act(async () => {
				result.current.handlePreview()
			})

			// Advance only halfway
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
			})

			// Call again - should reset the timer
			await act(async () => {
				result.current.handlePreview()
			})

			// Advance another half - still shouldn't trigger (timer was reset)
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
			})

			expect(toast.info).not.toHaveBeenCalled()

			// Advance remaining time - now the second call fires
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
				await Promise.resolve()
			})

			// Only one toast call should have been made (deduplicated)
			expect(vi.mocked(toast.info).mock.calls.length).toBe(1)
		})

		it('should show info toast on preview attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			// Shows info toast indicating feature is not yet available
			expect(toast.info).toHaveBeenCalledWith(
				'PDF preview is not yet available'
			)
			// previewUrl remains null since feature is not implemented
			expect(result.current.previewUrl).toBeNull()
		})

		it('should reset isGeneratingPreview after preview attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
			})

			// Before debounce fires, isGeneratingPreview is false
			expect(result.current.isGeneratingPreview).toBe(false)

			// After debounce timer fires
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			// After info toast, isGeneratingPreview should be false again
			expect(result.current.isGeneratingPreview).toBe(false)
		})
	})

	describe('handleExport', () => {
		it('should set isExporting to false after export completes', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			// After the info toast and finally runs, isExporting should be false
			expect(result.current.isExporting).toBe(false)
		})

		it('should show info toast on export attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			// Shows info toast indicating feature is not yet available
			expect(toast.info).toHaveBeenCalledWith(
				'PDF export is not yet available'
			)
		})

		it('should reset isExporting to false after export attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(result.current.isExporting).toBe(false)
		})
	})

	describe('cleanup', () => {
		it('should clear debounce timer on unmount before it fires', async () => {
			const { result, unmount } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
			})

			// Unmount before debounce fires
			unmount()

			// Advance timer - toast.info should NOT be called because timer was cleared
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			expect(toast.info).not.toHaveBeenCalled()
		})

		it('should not throw on unmount without preview', () => {
			const { unmount } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			// Should not throw
			expect(() => unmount()).not.toThrow()
		})
	})
})
