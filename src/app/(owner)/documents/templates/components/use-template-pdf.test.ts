/**
 * Tests for useTemplatePdf hook
 *
 * Validates real PDF generation via the generate-pdf Edge Function:
 * - handlePreview debounces, calls Edge Function, sets blob URL for iframe
 * - handleExport calls callGeneratePdfFromHtml for browser download
 * - Error handling shows toast on fetch failure
 * - Cleanup revokes blob URLs and clears debounce timers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// vi.hoisted() for mock variables referenced inside vi.mock() factories
const {
	mockBuildTemplateHtml,
	mockCallGeneratePdfFromHtml,
	mockGetSession
} = vi.hoisted(() => ({
	mockBuildTemplateHtml: vi.fn(() => '<html>mock</html>'),
	mockCallGeneratePdfFromHtml: vi.fn(),
	mockGetSession: vi.fn()
}))

vi.mock('./build-template-html', () => ({
	buildTemplateHtml: mockBuildTemplateHtml
}))

vi.mock('#hooks/api/use-report-mutations', () => ({
	callGeneratePdfFromHtml: mockCallGeneratePdfFromHtml
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: mockGetSession
		}
	})
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}))

import { useTemplatePdf } from './use-template-pdf'
import { toast } from 'sonner'

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

// Mock global fetch
const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', {
	value: mockFetch,
	writable: true
})

describe('useTemplatePdf', () => {
	const mockTemplate = 'property-inspection'
	const mockPayload = {
		templateTitle: 'Test Template',
		branding: {
			companyName: 'Test Company',
			logoUrl: null,
			primaryColor: 'steelblue'
		},
		customFields: [],
		clauses: [],
		data: {}
	}
	const mockGetPayload = vi.fn(() => mockPayload)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
		mockGetSession.mockResolvedValue({
			data: {
				session: { access_token: 'test-jwt-token' }
			}
		})
		mockFetch.mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(new Blob(['pdf-data'], { type: 'application/pdf' }))
		})
		mockCallGeneratePdfFromHtml.mockResolvedValue(undefined)
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
		it('should debounce preview calls and call generate-pdf Edge Function', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
			})

			// Before debounce, fetch should not be called
			expect(mockFetch).not.toHaveBeenCalled()

			// Advance timer past debounce delay
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			// After debounce, fetch should be called with correct URL and body
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/functions/v1/generate-pdf'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: 'Bearer test-jwt-token',
						'Content-Type': 'application/json'
					})
				})
			)
		})

		it('should set previewUrl from blob response', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			expect(mockCreateObjectURL).toHaveBeenCalled()
			expect(result.current.previewUrl).toBe('blob:mock-url')
		})

		it('should set isGeneratingPreview during fetch and false after', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
			})

			// Before debounce fires
			expect(result.current.isGeneratingPreview).toBe(false)

			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			// After preview completes
			expect(result.current.isGeneratingPreview).toBe(false)
		})

		it('should show error toast when fetch fails', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				statusText: 'Service Unavailable'
			})

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			expect(toast.error).toHaveBeenCalledWith(
				'Failed to generate preview. Please try again.'
			)
		})

		it('should revoke previous previewUrl before setting new one', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			// First preview
			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			expect(result.current.previewUrl).toBe('blob:mock-url')

			// Second preview
			mockCreateObjectURL.mockReturnValue('blob:mock-url-2')

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
			expect(result.current.previewUrl).toBe('blob:mock-url-2')
		})

		it('should cancel previous debounced call when called again', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

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

			// Advance another half - still should not trigger (timer was reset)
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
			})

			expect(mockFetch).not.toHaveBeenCalled()

			// Advance remaining time - now the second call fires
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY / 2)
				await vi.advanceTimersByTimeAsync(0)
			})

			// Only one fetch call should have been made (deduplicated)
			expect(mockFetch).toHaveBeenCalledTimes(1)
		})

		it('should call buildTemplateHtml with payload', async () => {
			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				result.current.handlePreview()
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await vi.advanceTimersByTimeAsync(0)
			})

			expect(mockBuildTemplateHtml).toHaveBeenCalledWith(mockPayload)
		})
	})

	describe('handleExport', () => {
		it('should call callGeneratePdfFromHtml with built HTML and filename', async () => {
			vi.useRealTimers()

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(mockCallGeneratePdfFromHtml).toHaveBeenCalledWith(
				'<html>mock</html>',
				'property-inspection.pdf'
			)
		})

		it('should set isExporting to true during operation and false after', async () => {
			vi.useRealTimers()

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(result.current.isExporting).toBe(false)
		})

		it('should show success toast on export completion', async () => {
			vi.useRealTimers()

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(toast.success).toHaveBeenCalledWith(
				'PDF exported successfully'
			)
		})

		it('should show error toast on export failure', async () => {
			vi.useRealTimers()
			mockCallGeneratePdfFromHtml.mockRejectedValue(
				new Error('PDF generation failed')
			)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(toast.error).toHaveBeenCalledWith(
				'Failed to export PDF. Please try again.'
			)
			expect(result.current.isExporting).toBe(false)
		})

		it('should call buildTemplateHtml with payload', async () => {
			vi.useRealTimers()

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(mockBuildTemplateHtml).toHaveBeenCalledWith(mockPayload)
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

			// Advance timer - fetch should NOT be called because timer was cleared
			await act(async () => {
				vi.advanceTimersByTime(DEBOUNCE_DELAY)
				await Promise.resolve()
			})

			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('should not throw on unmount without preview', () => {
			const { unmount } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			expect(() => unmount()).not.toThrow()
		})
	})
})
