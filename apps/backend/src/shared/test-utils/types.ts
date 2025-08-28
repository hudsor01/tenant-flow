/**
 * Shared test type definitions following CLAUDE.md DRY principle
 * Centralizes test mock types to avoid duplication
 */

import type { Logger } from '@nestjs/common'

/**
 * Properly typed mock logger for NestJS tests
 */
export interface MockLogger extends Partial<Logger> {
	log: jest.Mock
	error: jest.Mock
	warn: jest.Mock
	debug: jest.Mock
	verbose: jest.Mock
}

/**
 * Create a typed mock logger instance
 */
export function createMockLogger(): MockLogger {
	return {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn()
	}
}

/**
 * Mock request object with required properties for tests
 */
export interface MockRequest {
	url: string
	method: string
	body?: unknown
	headers?: Record<string, string | string[] | undefined>
	user?: unknown
}

/**
 * Mock response object for Fastify tests
 */
export interface MockResponse {
	status: jest.Mock<MockResponse>
	send: jest.Mock
	header: jest.Mock
	code: jest.Mock
}

/**
 * Create a typed mock response instance
 */
export function createMockResponse(): MockResponse {
	const response: MockResponse = {
		status: jest.fn() as jest.Mock<MockResponse>,
		send: jest.fn(),
		header: jest.fn(),
		code: jest.fn()
	}

	// Chain methods return self
	response.status.mockReturnValue(response)
	response.code.mockReturnValue(response)
	response.header.mockReturnValue(response)

	return response
}

/**
 * Create a typed mock request instance
 */
export function createMockRequest(
	overrides: Partial<MockRequest> = {}
): MockRequest {
	return {
		url: '/',
		method: 'GET',
		...overrides
	}
}
