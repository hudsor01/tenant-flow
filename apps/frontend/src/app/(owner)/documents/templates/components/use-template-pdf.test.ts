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
	})

	afterEach(() => {
		vi.restoreAllMocks()
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
		it('should set isGeneratingPreview to true during preview', async () => {
			const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' })
			const mockResponse = {
				ok: true,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			let previewPromise: Promise<void>
			act(() => {
				previewPromise = result.current.handlePreview()
			})

			expect(result.current.isGeneratingPreview).toBe(true)

			await act(async () => {
				await previewPromise
			})

			expect(result.current.isGeneratingPreview).toBe(false)
		})

		it('should create blob URL and show success toast on success', async () => {
			const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' })
			const mockResponse = {
				ok: true,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handlePreview()
			})

			expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
			expect(result.current.previewUrl).toBe('blob:mock-url')
			expect(toast.success).toHaveBeenCalledWith('PDF preview generated')
		})

		it('should show error toast on failure', async () => {
			const mockError = new Error('Network error')
			vi.spyOn(globalThis, 'fetch').mockRejectedValue(mockError)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handlePreview()
			})

			expect(result.current.previewUrl).toBeNull()
			expect(toast.error).toHaveBeenCalledWith('Network error')
		})

		it('should revoke previous URL when creating new preview', async () => {
			const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' })
			const mockResponse = {
				ok: true,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			mockCreateObjectURL
				.mockReturnValueOnce('blob:first-url')
				.mockReturnValueOnce('blob:second-url')

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			// First preview
			await act(async () => {
				await result.current.handlePreview()
			})

			expect(result.current.previewUrl).toBe('blob:first-url')

			// Second preview should revoke first
			await act(async () => {
				await result.current.handlePreview()
			})

			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:first-url')
			expect(result.current.previewUrl).toBe('blob:second-url')
		})

		it('should call getPayload to get current form data', async () => {
			const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' })
			const mockResponse = {
				ok: true,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handlePreview()
			})

			expect(mockGetPayload).toHaveBeenCalled()
		})
	})

	describe('handleExport', () => {
		it('should set isExporting to true during export', async () => {
			const mockResponse = {
				ok: true,
				text: vi.fn().mockResolvedValue(JSON.stringify({
					downloadUrl: 'https://storage.example.com/file.pdf'
				}))
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			let exportPromise: Promise<void>
			act(() => {
				exportPromise = result.current.handleExport()
			})

			expect(result.current.isExporting).toBe(true)

			await act(async () => {
				await exportPromise
			})

			expect(result.current.isExporting).toBe(false)
		})

		it('should open download URL in new window on success', async () => {
			const downloadUrl = 'https://storage.example.com/file.pdf'
			const mockResponse = {
				ok: true,
				text: vi.fn().mockResolvedValue(JSON.stringify({ downloadUrl }))
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(mockWindowOpen).toHaveBeenCalledWith(
				downloadUrl,
				'_blank',
				'noopener,noreferrer'
			)
			expect(toast.success).toHaveBeenCalledWith('Document PDF exported')
		})

		it('should show error toast when no download URL returned', async () => {
			const mockResponse = {
				ok: true,
				text: vi.fn().mockResolvedValue(JSON.stringify({}))
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(toast.error).toHaveBeenCalledWith(
				'Export failed to return a download URL'
			)
		})

		it('should show error toast on network failure', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

			const { result } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handleExport()
			})

			expect(toast.error).toHaveBeenCalledWith('Network error')
		})
	})

	describe('cleanup', () => {
		it('should revoke blob URL on unmount', async () => {
			const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' })
			const mockResponse = {
				ok: true,
				blob: vi.fn().mockResolvedValue(mockBlob)
			}
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response)

			const { result, unmount } = renderHook(() =>
				useTemplatePdf(mockTemplate, mockGetPayload)
			)

			await act(async () => {
				await result.current.handlePreview()
			})

			unmount()

			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
		})
	})
})
