/**
 * EMAIL AND TEST TYPES
 *
 * Consolidated email templates and testing interfaces
 */

// EMAIL TEMPLATE TYPES - Re-export from emails.ts (primary source)
export type {
	PaymentFailedEmailProps,
	PaymentSuccessEmailProps
} from './emails.js'

// SubscriptionCanceledEmailProps defined locally (not in emails.ts)
export interface SubscriptionCanceledEmailProps {
	customerEmail: string
	subscriptionId: string
	planName?: string
	canceledAt?: string
	refundAmount?: number
}

export interface EmailParams {
	to: string
	customerName?: string
	customerEmail?: string
	subject?: string
	replyTo?: string
}

// EMAIL TESTING TYPES

export interface EmailTestConfig {
	environment: 'development' | 'staging' | 'production' | 'test'
	mockEmails: boolean
	sendTestEmails: boolean
	testRecipient?: string
	smtpConfig?: {
		host: string
		port: number
		secure: boolean
		auth: {
			user: string
			pass: string
		}
	}
}

// TESTING INFRASTRUCTURE TYPES

export interface TestResult {
	suite: string
	passed: number
	failed: number
	skipped: number
	duration: number
	errors: string[]
}

export interface TestEnvironmentConfig {
	database: {
		url: string
		testSchema: string
		migrations: boolean
	}
	redis: {
		url: string
		testDb: number
	}
	auth: {
		jwtSecret: string
		testUsers: Array<{
			email: string
			password: string
			role: string
		}>
	}
	stripe: {
		testMode: boolean
		webhookEndpoint: string
		testProducts: string[]
	}
}

// CONVERSION AND MIGRATION TYPES

export interface ConversionStats {
	processed: number
	converted: number
	failed: number
	skipped: number
	errors: string[]
	warnings: string[]
	duration: number
}

export interface MigrationResult {
	success: boolean
	message: string
	itemsProcessed: number
	itemsConverted: number
	errors: string[]
}

// SECURITY EVENT TESTING
export type { SecurityEvent } from './security'

// MOCK INTERFACES FOR TESTING

export interface MockSupabaseClient {
	from: () => MockSupabaseClient
	select: () => MockSupabaseClient
	insert: () => MockSupabaseClient
	update: () => MockSupabaseClient
	delete: () => MockSupabaseClient
	rpc: () => MockSupabaseClient
}

export interface MockSupabaseService {
	getAdminClient: () => MockSupabaseClient
	getUserClient: () => MockSupabaseClient
	getUser: () => Promise<unknown>
}

export interface MockLogger {
	log: (...args: unknown[]) => void
	error: (...args: unknown[]) => void
	warn: (...args: unknown[]) => void
	debug: (...args: unknown[]) => void
	verbose: (...args: unknown[]) => void
}

export interface MockRequest {
	url: string
	method: string
	headers: Record<string, string>
	body?: unknown
	params?: Record<string, string>
	query?: Record<string, string>
	user?: unknown
}

export interface MockResponse {
	status: (code: number) => MockResponse
	send: (data: unknown) => void
	json: (data: unknown) => void
	redirect: (url: string) => void
	cookie: (name: string, value: string) => void
	clearCookie: (name: string) => void
}

// Email and test types complete
