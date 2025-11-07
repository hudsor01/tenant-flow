/**
 * Email Testing Configuration
 *
 * This file provides configuration and utilities for testing email functionality
 * across different environments (development, staging, production)
 */

import { Logger } from '@nestjs/common'

export interface EmailTestConfig {
	environment: 'development' | 'staging' | 'production' | 'test'
	mockEmails: boolean
	logEmails: boolean
	testRecipients?: string[]
	redirectAllTo?: string
	rateLimit?: {
		maxPerMinute: number
		maxPerHour: number
		maxPerDay: number
	}
	retryConfig?: {
		maxAttempts: number
		backoffMs: number
		maxBackoffMs: number
	}
}

/**
 * Stored email for test assertions
 */
export interface StoredEmail {
	to: string | string[]
	subject?: string
	template?: string
	html?: string
	text?: string
	timestamp: number
	messageId: string
	[key: string]: any
}

/**
 * Get email test configuration based on environment
 */
export function getEmailTestConfig(env?: string): EmailTestConfig {
	const environment = env || process.env.NODE_ENV
	if (!environment) {
		throw new Error('NODE_ENV is required for email test configuration')
	}

	switch (environment) {
		case 'test':
			return {
				environment: 'test',
				mockEmails: true,
				logEmails: true,
				testRecipients: ['test@example.com'],
				rateLimit: {
					maxPerMinute: 100,
					maxPerHour: 1000,
					maxPerDay: 10000
				},
				retryConfig: {
					maxAttempts: 1,
					backoffMs: 0,
					maxBackoffMs: 0
				}
			}

		case 'development':
			return {
				environment: 'development',
				mockEmails: false,
				logEmails: true,
				redirectAllTo: process.env.DEV_EMAIL_RECIPIENT || undefined,
				rateLimit: {
					maxPerMinute: 30,
					maxPerHour: 500,
					maxPerDay: 2000
				},
				retryConfig: {
					maxAttempts: 3,
					backoffMs: 1000,
					maxBackoffMs: 5000
				}
			}

		case 'staging':
			return {
				environment: 'staging',
				mockEmails: false,
				logEmails: true,
				testRecipients: [
					'staging-test1@tenantflow.app',
					'staging-test2@tenantflow.app'
				],
				rateLimit: {
					maxPerMinute: 60,
					maxPerHour: 1000,
					maxPerDay: 5000
				},
				retryConfig: {
					maxAttempts: 3,
					backoffMs: 2000,
					maxBackoffMs: 10000
				}
			}

		case 'production':
			return {
				environment: 'production',
				mockEmails: false,
				logEmails: false,
				rateLimit: {
					maxPerMinute: 100,
					maxPerHour: 2000,
					maxPerDay: 20000
				},
				retryConfig: {
					maxAttempts: 5,
					backoffMs: 5000,
					maxBackoffMs: 30000
				}
			}

		default:
			return getEmailTestConfig('development')
	}
}

/**
 * Email test utilities
 */
export class EmailTestUtils {
	private static readonly logger = new Logger(EmailTestUtils.name)
	private static sentEmails: StoredEmail[] = []
	private static emailMetrics = {
		sent: 0,
		failed: 0,
		retried: 0,
		queued: 0
	}

	/**
	 * Mock email sender for testing
	 */
	static async mockSendEmail(options: Partial<StoredEmail>): Promise<any> {
		const config = getEmailTestConfig()

		if (config.logEmails) {
			this.logger.log('Mock Email:', {
				to: options.to,
				subject: options.subject,
				template: options.template,
				timestamp: new Date().toISOString()
			})
		}

		// Store sent email for assertions
		this.sentEmails.push({
			...options,
			timestamp: Date.now(),
			messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
		})

		this.emailMetrics.sent++

		return {
			success: true,
			messageId: this.sentEmails[this.sentEmails.length - 1].messageId,
			mock: true
		}
	}

	/**
	 * Get all sent emails (for test assertions)
	 */
	static getSentEmails() {
		return [...this.sentEmails]
	}

	/**
	 * Get emails sent to a specific recipient
	 */
	static getEmailsTo(recipient: string) {
		return this.sentEmails.filter(email => {
			const to = email.to
			if (Array.isArray(to)) {
				return to.includes(recipient)
			}
			return to === recipient
		})
	}

	/**
	 * Clear sent emails (call between tests)
	 */
	static clearSentEmails() {
		this.sentEmails = []
	}

	/**
	 * Get email metrics
	 */
	static getMetrics() {
		return { ...this.emailMetrics }
	}

	/**
	 * Reset metrics
	 */
	static resetMetrics() {
		this.emailMetrics = {
			sent: 0,
			failed: 0,
			retried: 0,
			queued: 0
		}
	}

	/**
	 * Validate email HTML content
	 */
	static validateEmailHtml(html: string): {
		valid: boolean
		errors: string[]
		warnings: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []

		// Check for required elements
		if (!html.includes('<!DOCTYPE html>')) {
			errors.push('Missing DOCTYPE declaration')
		}
		if (!html.includes('<html')) {
			errors.push('Missing html tag')
		}
		if (!html.includes('<head')) {
			errors.push('Missing head tag')
		}
		if (!html.includes('<body')) {
			errors.push('Missing body tag')
		}

		// Check for common issues
		if (!html.includes('charset')) {
			warnings.push('Missing charset declaration')
		}
		if (!html.includes('viewport')) {
			warnings.push('Missing viewport meta tag (mobile compatibility)')
		}
		if (html.includes('<script')) {
			warnings.push('Contains script tags (may be blocked by email clients)')
		}
		if (html.includes('javascript:')) {
			errors.push('Contains javascript: protocol (security risk)')
		}

		// Check for email best practices
		if (!html.includes('alt=')) {
			warnings.push('Images without alt text')
		}
		if (html.length > 102400) {
			warnings.push('HTML size exceeds 100KB (may be clipped)')
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings
		}
	}

	/**
	 * Generate test email data
	 */
	static generateTestEmailData(template: string, overrides?: any) {
		const baseData: Record<string, any> = {
			welcome: {
				email: 'test@example.com',
				name: 'Test User',
				companySize: 'medium',
				source: 'test'
			},
			tenant_invitation: {
				tenantName: 'Test Tenant',
				propertyAddress: '123 Test St, Apt 4B',
				invitationLink: 'https://test.tenantflow.app/invite/test123',
				ownerName: 'Test Owner'
			},
			payment_reminder: {
				tenantName: 'Test Tenant',
				amountDue: 1500,
				dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
				propertyAddress: '456 Test Ave',
				paymentLink: 'https://test.tenantflow.app/pay/test456'
			},
			lease_expiration: {
				tenantName: 'Test Tenant',
				propertyAddress: '789 Test Blvd',
				expirationDate: new Date(
					Date.now() + 30 * 24 * 60 * 60 * 1000
				).toISOString(),
				renewalLink: 'https://test.tenantflow.app/renew/test789',
				leaseId: 'lease_test_123'
			}
		}

		return {
			...baseData[template],
			...overrides
		}
	}

	/**
	 * Simulate email delivery with realistic delays
	 */
	static async simulateEmailDelivery(delayMs = 100): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, delayMs))
	}

	/**
	 * Check if email would be rate limited
	 */
	static checkRateLimit(
		sentCount: number,
		timeWindowMs: number,
		config?: EmailTestConfig
	): boolean {
		const testConfig = config || getEmailTestConfig()

		if (!testConfig.rateLimit) {
			return false
		}

		const timeWindowMinutes = timeWindowMs / (60 * 1000)
		const timeWindowHours = timeWindowMs / (60 * 60 * 1000)
		const timeWindowDays = timeWindowMs / (24 * 60 * 60 * 1000)

		const ratePerMinute = sentCount / timeWindowMinutes
		const ratePerHour = sentCount / timeWindowHours
		const ratePerDay = sentCount / timeWindowDays

		return (
			ratePerMinute > testConfig.rateLimit.maxPerMinute ||
			ratePerHour > testConfig.rateLimit.maxPerHour ||
			ratePerDay > testConfig.rateLimit.maxPerDay
		)
	}
}

/**
 * Email test assertions
 */
export class EmailAssertions {
	/**
	 * Assert email was sent to recipient
	 */
	static assertEmailSent(recipient: string, subject?: string) {
		const emails = EmailTestUtils.getEmailsTo(recipient)

		if (emails.length === 0) {
			throw new Error(`No emails sent to ${recipient}`)
		}

		if (subject) {
			const matchingEmails = emails.filter(e => e.subject?.includes(subject))
			if (matchingEmails.length === 0) {
				throw new Error(
					`No emails with subject "${subject}" sent to ${recipient}`
				)
			}
		}
	}

	/**
	 * Assert no emails sent to recipient
	 */
	static assertNoEmailSent(recipient: string) {
		const emails = EmailTestUtils.getEmailsTo(recipient)

		if (emails.length > 0) {
			throw new Error(
				`Unexpected emails sent to ${recipient}: ${emails.length} found`
			)
		}
	}

	/**
	 * Assert email contains content
	 */
	static assertEmailContains(recipient: string, content: string) {
		const emails = EmailTestUtils.getEmailsTo(recipient)

		if (emails.length === 0) {
			throw new Error(`No emails sent to ${recipient}`)
		}

		const matchingEmails = emails.filter(
			e => e.html?.includes(content) || e.text?.includes(content)
		)

		if (matchingEmails.length === 0) {
			throw new Error(`No emails to ${recipient} contain "${content}"`)
		}
	}

	/**
	 * Assert email count
	 */
	static assertEmailCount(expectedCount: number, recipient?: string) {
		const emails = recipient
			? EmailTestUtils.getEmailsTo(recipient)
			: EmailTestUtils.getSentEmails()

		if (emails.length !== expectedCount) {
			throw new Error(
				`Expected ${expectedCount} emails${recipient ? ` to ${recipient}` : ''}, ` +
					`but found ${emails.length}`
			)
		}
	}
}

/**
 * Email performance testing utilities
 */
export class EmailPerformanceTest {
	private static metrics: {
		renderTimes: number[]
		sendTimes: number[]
		totalTimes: number[]
	} = {
		renderTimes: [],
		sendTimes: [],
		totalTimes: []
	}

	/**
	 * Measure template rendering performance
	 */
	static async measureRenderTime(
		renderFn: () => Promise<any>
	): Promise<number> {
		const start = process.hrtime.bigint()
		await renderFn()
		const end = process.hrtime.bigint()
		const timeMs = Number(end - start) / 1_000_000

		this.metrics.renderTimes.push(timeMs)
		return timeMs
	}

	/**
	 * Get performance statistics
	 */
	static getStats() {
		const calculate = (times: number[]) => {
			if (times.length === 0) {
				return null
			}

			const sorted = [...times].sort((a, b) => a - b)
			const sum = sorted.reduce((a, b) => a + b, 0)

			return {
				min: sorted[0],
				max: sorted[sorted.length - 1],
				avg: sum / sorted.length,
				median: sorted[Math.floor(sorted.length / 2)],
				p95: sorted[Math.floor(sorted.length * 0.95)],
				p99: sorted[Math.floor(sorted.length * 0.99)]
			}
		}

		return {
			render: calculate(this.metrics.renderTimes),
			send: calculate(this.metrics.sendTimes),
			total: calculate(this.metrics.totalTimes)
		}
	}

	/**
	 * Reset performance metrics
	 */
	static reset() {
		this.metrics = {
			renderTimes: [],
			sendTimes: [],
			totalTimes: []
		}
	}
}
