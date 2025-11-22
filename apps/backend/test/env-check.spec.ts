/**
 * Test to verify environment variables are accessible
 * Following CLAUDE.md: NO ABSTRACTIONS, simple direct checks
 */

import { Logger } from '@nestjs/common'

const testLogger = new Logger('EnvCheck')

describe('Environment Variables Access', () => {
	it('should access SB_URL from environment', () => {
		testLogger.log('SB_URL:', process.env.SB_URL)

		// Direct environment variable check - no abstractions
		expect(process.env.SB_URL).toBeDefined()
		expect(process.env.SB_URL).toMatch(/^https?:\/\//)
	})

	it('should access SB_SECRET_KEY from environment', () => {
		testLogger.log(
			'SB_SECRET_KEY available:',
			!!process.env.SB_SECRET_KEY
		)
		testLogger.log(
			'First 20 chars:',
			process.env.SB_SECRET_KEY?.substring(0, 20)
		)

		expect(process.env.SB_SECRET_KEY).toBeDefined()

		// Should be a JWT token (legacy format), new secret format (sb_secret_), or demo value
		expect(process.env.SB_SECRET_KEY).toMatch(
			/^(eyJ|sb_secret_|demo-service-key)/
		)
	})

	it('should check SB_PUBLISHABLE_KEY availability', () => {
		testLogger.log(
			'SB_PUBLISHABLE_KEY available:',
			!!process.env.SB_PUBLISHABLE_KEY
		)

		// SB_PUBLISHABLE_KEY may not be in all environments - that's OK
		if (process.env.SB_PUBLISHABLE_KEY) {
			// Accept any non-empty string (Supabase publishable keys have varying formats)
			const isValidFormat = process.env.SB_PUBLISHABLE_KEY.length > 0
			expect(isValidFormat).toBeTruthy()
			testLogger.log('SB_PUBLISHABLE_KEY is set and non-empty')
		} else {
			testLogger.log(
				'SB_PUBLISHABLE_KEY not set - using fallback in tests'
			)
		}
	})

	it('should show environment status', () => {
		testLogger.log('\n=== ENVIRONMENT STATUS ===')
		testLogger.log('SB_URL:', process.env.SB_URL)
		testLogger.log(
			'SB_PUBLISHABLE_KEY:',
			!!process.env.SB_PUBLISHABLE_KEY
		)
		testLogger.log('SB_SECRET_KEY:', !!process.env.SB_SECRET_KEY)
		testLogger.log(
			'STRIPE_SECRET_KEY:',
			!!process.env.STRIPE_SECRET_KEY,
			'(optional)'
		)
		testLogger.log('DATABASE_URL:', !!process.env.DATABASE_URL, '(optional)')
	})
})
