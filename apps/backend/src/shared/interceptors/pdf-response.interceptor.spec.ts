import { Test, type TestingModule } from '@nestjs/testing'
import { of } from 'rxjs'
import {
	PdfResponseInterceptor,
	type PdfResponse
} from './pdf-response.interceptor'
import type { ExecutionContext, CallHandler } from '@nestjs/common'

describe('PdfResponseInterceptor', () => {
	let interceptor: PdfResponseInterceptor
	let mockResponse: {
		set: jest.Mock
	}
	let mockContext: ExecutionContext
	let mockCallHandler: CallHandler

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [PdfResponseInterceptor]
		}).compile()

		interceptor = module.get<PdfResponseInterceptor>(PdfResponseInterceptor)

		// Mock response object
		mockResponse = {
			set: jest.fn()
		}

		// Mock ExecutionContext
		mockContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn()
			}),
			getClass: jest.fn(),
			getHandler: jest.fn(),
			getArgs: jest.fn(),
			getArgByIndex: jest.fn(),
			switchToRpc: jest.fn(),
			switchToWs: jest.fn(),
			getType: jest.fn()
		} as unknown as ExecutionContext
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should be defined', () => {
		expect(interceptor).toBeDefined()
	})

	describe('PDF Response Handling', () => {
		it('should set correct headers for attachment disposition', async () => {
			const pdfBuffer = Buffer.from('PDF content')
			const pdfResponse: PdfResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: 'lease-12345.pdf',
				buffer: pdfBuffer
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(pdfResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).toHaveBeenCalledWith({
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'attachment; filename="lease-12345.pdf"',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			})

			expect(result).toBe(pdfBuffer)
		})

		it('should set correct headers for inline disposition', async () => {
			const pdfBuffer = Buffer.from('PDF content')
			const pdfResponse: PdfResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'inline',
				filename: 'preview-12345.pdf',
				buffer: pdfBuffer
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(pdfResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).toHaveBeenCalledWith({
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'inline; filename="preview-12345.pdf"',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			})

			expect(result).toBe(pdfBuffer)
		})

		it('should handle filenames with special characters', async () => {
			const pdfBuffer = Buffer.from('PDF content')
			const pdfResponse: PdfResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: 'lease (special) [chars].pdf',
				buffer: pdfBuffer
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(pdfResponse))
			}

			await interceptor.intercept(mockContext, mockCallHandler).toPromise()

			expect(mockResponse.set).toHaveBeenCalledWith(
				expect.objectContaining({
					'Content-Disposition':
						'attachment; filename="lease (special) [chars].pdf"'
				})
			)
		})

		it('should return buffer directly as response body', async () => {
			const pdfBuffer = Buffer.from('PDF binary content here')
			const pdfResponse: PdfResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: 'test.pdf',
				buffer: pdfBuffer
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(pdfResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(result).toBe(pdfBuffer)
			expect(Buffer.isBuffer(result)).toBe(true)
		})
	})

	describe('Non-PDF Response Handling', () => {
		it('should pass through non-PDF JSON responses unchanged', async () => {
			const jsonResponse = {
				success: true,
				data: { id: '123', name: 'Test' }
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(jsonResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toEqual(jsonResponse)
		})

		it('should pass through string responses unchanged', async () => {
			const stringResponse = 'Plain text response'

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(stringResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toBe(stringResponse)
		})

		it('should pass through number responses unchanged', async () => {
			const numberResponse = 42

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(numberResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toBe(numberResponse)
		})

		it('should pass through array responses unchanged', async () => {
			const arrayResponse = [{ id: 1 }, { id: 2 }]

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(arrayResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toEqual(arrayResponse)
		})

		it('should pass through responses with contentType other than application/pdf', async () => {
			const csvResponse = {
				success: true,
				contentType: 'text/csv',
				filename: 'report.csv',
				data: 'col1,col2\nval1,val2'
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(csvResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toEqual(csvResponse)
		})
	})

	describe('Edge Cases', () => {
		it('should handle null response', async () => {
			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(null))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toBeNull()
		})

		it('should handle undefined response', async () => {
			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(undefined))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toBeUndefined()
		})

		it('should handle response with contentType but not PDF', async () => {
			const response = {
				success: true,
				contentType: 'application/json',
				data: {}
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(response))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			expect(mockResponse.set).not.toHaveBeenCalled()
			expect(result).toEqual(response)
		})

		it('should handle malformed PDF response (missing buffer)', async () => {
			const malformedResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: 'test.pdf'
				// Missing buffer field
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(malformedResponse))
			}

			const result = await interceptor
				.intercept(mockContext, mockCallHandler)
				.toPromise()

			// Should still set headers
			expect(mockResponse.set).toHaveBeenCalled()
			// Will return undefined buffer
			expect(result).toBeUndefined()
		})
	})

	describe('Cache Control Headers', () => {
		it('should set no-cache headers to prevent PDF caching', async () => {
			const pdfBuffer = Buffer.from('PDF content')
			const pdfResponse: PdfResponse = {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: 'test.pdf',
				buffer: pdfBuffer
			}

			mockCallHandler = {
				handle: jest.fn().mockReturnValue(of(pdfResponse))
			}

			await interceptor.intercept(mockContext, mockCallHandler).toPromise()

			const headers = mockResponse.set.mock.calls[0][0]
			expect(headers['Cache-Control']).toBe(
				'no-cache, no-store, must-revalidate'
			)
			expect(headers.Pragma).toBe('no-cache')
			expect(headers.Expires).toBe('0')
		})
	})
})
