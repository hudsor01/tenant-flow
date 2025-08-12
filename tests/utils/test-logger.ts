/**
 * Test Logger Utility
 * Replaces console.log statements in test files with structured test logging
 * Provides debugging capabilities for tests while maintaining clean output
 */

interface TestContext {
	testName?: string
	step?: string
	component?: string
	action?: string
	[key: string]: any
}

class TestLogger {
	private readonly enabled: boolean
	private readonly verbose: boolean

	constructor() {
		this.enabled =
			process.env.TEST_DEBUG === 'true' || process.env.DEBUG === 'true'
		this.verbose = process.env.TEST_VERBOSE === 'true'
	}

	/**
	 * Debug information - only shown when TEST_DEBUG=true
	 */
	debug(message: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-DEBUG] ${message}`, data || '')
		}
	}

	/**
	 * Test step logging - helps track test progress
	 */
	step(step: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-STEP] ${step}`, data || '')
		}
	}

	/**
	 * Test information - shown when verbose
	 */
	info(message: string, data?: TestContext): void {
		if (this.verbose || this.enabled) {
			console.log(`[TEST-INFO] ${message}`, data || '')
		}
	}

	/**
	 * Test warnings - always shown
	 */
	warn(message: string, data?: TestContext): void {
		console.warn(`[TEST-WARN] ${message}`, data || '')
	}

	/**
	 * Test errors - always shown
	 */
	error(message: string, error?: Error, data?: TestContext): void {
		console.error(`[TEST-ERROR] ${message}`, error || '', data || '')
	}

	/**
	 * API call logging for tests
	 */
	apiCall(
		method: string,
		url: string,
		status: number,
		data?: TestContext
	): void {
		if (this.enabled) {
			console.log(`[TEST-API] ${method} ${url} → ${status}`, data || '')
		}
	}

	/**
	 * Authentication test logging
	 */
	auth(event: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-AUTH] ${event}`, data || '')
		}
	}

	/**
	 * Database operation logging
	 */
	db(operation: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-DB] ${operation}`, data || '')
		}
	}

	/**
	 * Performance measurement for tests
	 */
	performance(operation: string, duration: number, data?: TestContext): void {
		if (this.enabled) {
			const level =
				duration > 5000 ? 'SLOW' : duration > 1000 ? 'MEDIUM' : 'FAST'
			console.log(
				`[TEST-PERF-${level}] ${operation}: ${duration}ms`,
				data || ''
			)
		}
	}

	/**
	 * Group related test logs
	 */
	group(title: string): void {
		if (this.enabled) {
			console.group(`[TEST-GROUP] ${title}`)
		}
	}

	/**
	 * End log group
	 */
	groupEnd(): void {
		if (this.enabled) {
			console.groupEnd()
		}
	}

	/**
	 * Create a scoped logger for a specific test
	 */
	forTest(testName: string): TestLogger {
		const scopedLogger = new TestLogger()
		;(scopedLogger as any).testName = testName
		return scopedLogger
	}

	/**
	 * Log test setup/teardown
	 */
	setup(message: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-SETUP] ${message}`, data || '')
		}
	}

	/**
	 * Log test cleanup
	 */
	cleanup(message: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-CLEANUP] ${message}`, data || '')
		}
	}

	/**
	 * Log assertion information
	 */
	assertion(message: string, expected: any, actual: any): void {
		if (this.enabled) {
			console.log(`[TEST-ASSERT] ${message}`, { expected, actual })
		}
	}

	/**
	 * Log mock information
	 */
	mock(service: string, method: string, data?: TestContext): void {
		if (this.enabled) {
			console.log(`[TEST-MOCK] ${service}.${method}`, data || '')
		}
	}
}

// Export singleton instance
export const testLogger = new TestLogger()

// Export class for custom instances
export { TestLogger }

// Convenience functions
export const logTest = {
	debug: (message: string, data?: any) => testLogger.debug(message, data),
	step: (step: string, data?: any) => testLogger.step(step, data),
	info: (message: string, data?: any) => testLogger.info(message, data),
	warn: (message: string, data?: any) => testLogger.warn(message, data),
	error: (message: string, error?: Error, data?: any) =>
		testLogger.error(message, error, data),
	api: (method: string, url: string, status: number, data?: any) =>
		testLogger.apiCall(method, url, status, data),
	auth: (event: string, data?: any) => testLogger.auth(event, data),
	db: (operation: string, data?: any) => testLogger.db(operation, data),
	perf: (operation: string, duration: number, data?: any) =>
		testLogger.performance(operation, duration, data),
	group: (title: string) => testLogger.group(title),
	groupEnd: () => testLogger.groupEnd(),
	setup: (message: string, data?: any) => testLogger.setup(message, data),
	cleanup: (message: string, data?: any) => testLogger.cleanup(message, data),
	assert: (message: string, expected: any, actual: any) =>
		testLogger.assertion(message, expected, actual),
	mock: (service: string, method: string, data?: any) =>
		testLogger.mock(service, method, data)
}
