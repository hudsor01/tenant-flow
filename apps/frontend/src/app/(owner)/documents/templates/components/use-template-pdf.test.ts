/**
 * Tests for useTemplatePdf hook
 *
 * Note: After NestJS removal (phase-57), PDF preview and export are stubs.
 * These tests validate the stub behavior pattern:
 * - handlePreview debounces, then shows a stub error toast
 * - handleExport sets isExporting, then shows a stub error toast
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
		error: vi.fn()
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

			// Call preview - should not immediately trigger error toast (debounced)
			await act(async () => {
				result.current.handlePreview()
			})

			expect(toast.error).not.toHaveBeenCalled()

			// Advance timer past debounce delay
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve() // flush microtasks
			})

			// After debounce fires, the stub error should appear
			expect(toast.error).toHaveBeenCalled()
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

			expect(toast.error).not.toHaveBeenCalled()

			// Advance remaining time - now the second call fires
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
				await Promise.resolve()
			})

			// Only one toast call should have been made (deduplicated)
			expect(vi.mocked(toast.error).mock.calls.length).toBe(1)
		})

		it('should show stub error toast on preview attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			// Stub shows error toast with the stub message
			expect(toast.error).toHaveBeenCalledWith(
				'PDF preview requires StirlingPDF Edge Function implementation'
			)
			// previewUrl remains null since stub throws
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

			// After stub throws, isGeneratingPreview should be false again
			expect(result.current.isGeneratingPreview).toBe(false)
		})
	})

	describe('handleExport', () => {
		it('should set isExporting to false after export completes', async () => {
			// Note: Since the stub throws synchronously, React may batch the
			// setIsExporting(true) and setIsExporting(false) updates together,
			// making it impossible to observe the intermediate 'true' state.
			// We verify the final state (false) after completion.
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			// After the stub throws and finally runs, isExporting should be false
			expect(result.current.isExporting).toBe(false)
		})

		it('should show stub error toast on export attempt', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			// Stub shows error toast with the stub message
			expect(toast.error).toHaveBeenCalledWith(
				'PDF export requires StirlingPDF Edge Function implementation'
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

			// Advance timer - toast.error should NOT be called because timer was cleared
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			expect(toast.error).not.toHaveBeenCalled()
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
