/**
 * Controller Test Utilities
 *
 * Helpers for testing NestJS controllers with HTTP layer.
 * Focuses on:
 * - Testing HTTP endpoints
 * - Error response mapping
 * - Request validation via pipes
 * - Cache decorator integration
 */

import { Test, type TestingModule } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import * as request from 'supertest'

/**
 * Controller test result
 */
export interface ControllerTestResult {
	status: number
	body: unknown
	headers: Record<string, string>
}

/**
 * Create a test controller with mocked service
 *
 * @example
 * ```typescript
 * const controllerTest = await createControllerTest(
 *   PropertiesController,
 *   PropertiesService,
 *   {
 *     create: jest.fn().mockResolvedValue({ id: 'prop-1' })
 *   }
 * )
 *
 * const response = await controllerTest.post('/properties', {
 *   name: 'Test'
 * })
 *
 * expect(response.status).toBe(201)
 * expect(response.body.id).toBe('prop-1')
 * ```
 */
export interface ControllerTestBed<TService = unknown> {
	app: INestApplication
	service: TService
	get: <T>(path: string) => Promise<ControllerTestResult & { body: T }>
	post: <T>(
		path: string,
		body: unknown
	) => Promise<ControllerTestResult & { body: T }>
	put: <T>(
		path: string,
		body: unknown
	) => Promise<ControllerTestResult & { body: T }>
	delete: <T>(path: string) => Promise<ControllerTestResult & { body: T }>
	patch: <T>(
		path: string,
		body: unknown
	) => Promise<ControllerTestResult & { body: T }>
	close: () => Promise<void>
}

type Constructor<T> = new (...args: unknown[]) => T

/**
 * Create a testbed for controller testing with Supertest
 */
export async function createControllerTest<TController, TService>(
	controllerClass: Constructor<TController>,
	serviceClass: Constructor<TService>,
	serviceMocks: Partial<TService> = {}
): Promise<ControllerTestBed<TService>> {
	const mockService: Record<string, jest.Mock> = {}
	Object.keys(serviceMocks).forEach(key => {
		mockService[key] = jest
			.fn()
			.mockResolvedValue(serviceMocks[key as keyof TService])
	})

	const moduleRef: TestingModule = await Test.createTestingModule({
		controllers: [controllerClass],
		providers: [
			{
				provide: serviceClass,
				useValue: mockService
			}
		]
	}).compile()

	const app = moduleRef.createNestApplication()
	await app.init()

	const httpServer = app.getHttpServer()

	return {
		app,
		service: mockService,
		get: async <T>(
			path: string
		): Promise<ControllerTestResult & { body: T }> => {
			const res = await request(httpServer).get(path)
			return {
				status: res.status,
				body: res.body,
				headers: res.headers
			}
		},
		post: async <T>(
			path: string,
			body: unknown
		): Promise<ControllerTestResult & { body: T }> => {
			const res = await request(httpServer)
				.post(path)
				.send(body)
				.set('Content-Type', 'application/json')
			return {
				status: res.status,
				body: res.body,
				headers: res.headers
			}
		},
		put: async <T>(
			path: string,
			body: unknown
		): Promise<ControllerTestResult & { body: T }> => {
			const res = await request(httpServer)
				.put(path)
				.send(body)
				.set('Content-Type', 'application/json')
			return {
				status: res.status,
				body: res.body,
				headers: res.headers
			}
		},
		delete: async <T>(
			path: string
		): Promise<ControllerTestResult & { body: T }> => {
			const res = await request(httpServer).delete(path)
			return {
				status: res.status,
				body: res.body,
				headers: res.headers
			}
		},
		patch: async <T>(
			path: string,
			body: unknown
		): Promise<ControllerTestResult & { body: T }> => {
			const res = await request(httpServer)
				.patch(path)
				.send(body)
				.set('Content-Type', 'application/json')
			return {
				status: res.status,
				body: res.body,
				headers: res.headers
			}
		},
		close: async () => {
			await app.close()
		}
	}
}

/**
 * Test HTTP response expectations
 *
 * @example
 * ```typescript
 * expectHTTPResponse(response, {
 *   status: 200,
 *   bodyContains: { id: 'prop-1' }
 * })
 * ```
 */
export interface HTTPResponseExpectation {
	status: number
	bodyContains?: Partial<Record<string, unknown>>
	bodyLength?: number
	headerContains?: Record<string, string>
}

export function expectHTTPResponse(
	response: ControllerTestResult,
	expectations: HTTPResponseExpectation
): void {
	if (response.status !== expectations.status) {
		throw new Error(
			`Expected status ${expectations.status}, got ${response.status}`
		)
	}

	if (expectations.bodyContains) {
		Object.entries(expectations.bodyContains).forEach(([key, value]) => {
			if (JSON.stringify(response.body[key]) !== JSON.stringify(value)) {
				throw new Error(
					`Expected body.${key} = ${JSON.stringify(value)}, got ${JSON.stringify(response.body[key])}`
				)
			}
		})
	}

	if (expectations.bodyLength !== undefined) {
		if (Array.isArray(response.body)) {
			if (response.body.length !== expectations.bodyLength) {
				throw new Error(
					`Expected body length ${expectations.bodyLength}, got ${response.body.length}`
				)
			}
		}
	}

	if (expectations.headerContains) {
		Object.entries(expectations.headerContains).forEach(([key, value]) => {
			if (response.headers[key.toLowerCase()] !== value) {
				throw new Error(
					`Expected header ${key} = ${value}, got ${response.headers[key.toLowerCase()]}`
				)
			}
		})
	}
}

/**
 * Test error response expectations
 *
 * @example
 * ```typescript
 * expectErrorResponse(response, {
 *   status: 400,
 *   messageContains: 'validation failed'
 * })
 * ```
 */
export interface ErrorResponseExpectation {
	status: number
	messageContains?: string
	errorCodeContains?: string
}

export function expectErrorResponse(
	response: ControllerTestResult,
	expectations: ErrorResponseExpectation
): void {
	if (response.status !== expectations.status) {
		throw new Error(
			`Expected error status ${expectations.status}, got ${response.status}`
		)
	}

	const errorMessage = response.body.message || ''
	if (expectations.messageContains) {
		if (!errorMessage.includes(expectations.messageContains)) {
			throw new Error(
				`Expected error message containing "${expectations.messageContains}", got "${errorMessage}"`
			)
		}
	}

	if (expectations.errorCodeContains) {
		if (!response.body.error?.includes(expectations.errorCodeContains)) {
			throw new Error(
				`Expected error code containing "${expectations.errorCodeContains}", got "${response.body.error}"`
			)
		}
	}
}

/**
 * Mock controller request with authentication
 *
 * @example
 * ```typescript
 * const request = createAuthenticatedRequest({
 *   userId: 'user-123',
 *   token: 'bearer-token-123'
 * })
 * ```
 */
type AuthenticatedRequestOverrides = Partial<{
	userId: string
	email: string
	token: string
	headers: Record<string, string>
}> &
	Record<string, unknown>

export function createAuthenticatedRequest(
	overrides: AuthenticatedRequestOverrides = {}
) {
	const overrideHeaders = overrides.headers ?? {}
	return {
		user: {
			id: overrides.userId || 'user-123',
			email: overrides.email || 'user@example.com',
			aud: 'authenticated'
		},
		headers: {
			authorization: `Bearer ${overrides.token || 'test-token'}`,
			...overrideHeaders
		},
		...overrides
	}
}

/**
 * Create mock response for piped DTO validation
 *
 * @example
 * ```typescript
 * const mockResponse = createMockResponse()
 * ```
 */
export function createMockResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
		end: jest.fn()
	}
}

/**
 * Test controller caching behavior
 *
 * @example
 * ```typescript
 * const cacheTest = new ControllerCacheTest()
 * cacheTest.expectCacheKey('/properties', 'properties-list')
 * cacheTest.expectCacheTTL('/properties', 300)
 * ```
 */
export class ControllerCacheTest {
	private cacheKeys: Map<string, string> = new Map()
	private cacheTTLs: Map<string, number> = new Map()

	registerCacheKey(endpoint: string, key: string): void {
		this.cacheKeys.set(endpoint, key)
	}

	registerCacheTTL(endpoint: string, ttl: number): void {
		this.cacheTTLs.set(endpoint, ttl)
	}

	expectCacheKey(endpoint: string, expectedKey: string): void {
		const actual = this.cacheKeys.get(endpoint)
		if (actual !== expectedKey) {
			throw new Error(
				`Expected cache key "${expectedKey}" for endpoint ${endpoint}, got "${actual}"`
			)
		}
	}

	expectCacheTTL(endpoint: string, expectedTTL: number): void {
		const actual = this.cacheTTLs.get(endpoint)
		if (actual !== expectedTTL) {
			throw new Error(
				`Expected cache TTL ${expectedTTL} for endpoint ${endpoint}, got ${actual}`
			)
		}
	}
}

/**
 * Test pagination in controller responses
 *
 * @example
 * ```typescript
 * expectPaginatedResponse(response, {
 *   pageSize: 20,
 *   currentPage: 1,
 *   totalCount: 100
 * })
 * ```
 */
export interface PaginationExpectation {
	pageSize: number
	currentPage: number
	totalCount: number
}

export function expectPaginatedResponse(
	response: ControllerTestResult,
	expectations: PaginationExpectation
): void {
	const data = response.body
	if (!data.data || !Array.isArray(data.data)) {
		throw new Error('Expected paginated response with data array')
	}

	if (data.pageSize !== expectations.pageSize) {
		throw new Error(
			`Expected pageSize ${expectations.pageSize}, got ${data.pageSize}`
		)
	}

	if (data.currentPage !== expectations.currentPage) {
		throw new Error(
			`Expected currentPage ${expectations.currentPage}, got ${data.currentPage}`
		)
	}

	if (data.totalCount !== expectations.totalCount) {
		throw new Error(
			`Expected totalCount ${expectations.totalCount}, got ${data.totalCount}`
		)
	}
}

/**
 * Test multipart/form-data requests in controller
 *
 * @example
 * ```typescript
 * const formData = new FormData()
 * formData.append('file', Buffer.from('test'), 'test.txt')
 * const response = await controllerTest.uploadFile('/properties/123/documents', formData)
 * ```
 */
export async function uploadFile(
	controllerTest: ControllerTestBed,
	endpoint: string,
	file: Buffer,
	fileName: string,
	additionalFields?: Record<string, string>
): Promise<ControllerTestResult> {
	let req = request(controllerTest.app.getHttpServer())
		.post(endpoint)
		.attach('file', file, fileName)

	if (additionalFields) {
		Object.entries(additionalFields).forEach(([key, value]) => {
			req = req.field(key, value)
		})
	}

	const res = await req
	return {
		status: res.status,
		body: res.body,
		headers: res.headers
	}
}
