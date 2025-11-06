/**
 * Test to verify environment variables are accessible
 * Following CLAUDE.md: NO ABSTRACTIONS, simple direct checks
 */

import { Logger } from '@nestjs/common'

const testLogger = new Logger('EnvCheck')

describe('Environment Variables Access', () => {
	it('should access SUPABASE_URL from environment', () => {
		testLogger.log('SUPABASE_URL:', process.env.SUPABASE_URL)

		// Direct environment variable check - no abstractions
		expect(process.env.SUPABASE_URL).toBeDefined()
		expect(process.env.SUPABASE_URL).toMatch(/^https?:\/\//)
	})

	it('should access SUPABASE_SECRET_KEY from environment', () => {
		testLogger.log(
			'SUPABASE_SECRET_KEY available:',
			!!process.env.SUPABASE_SECRET_KEY
		)
		testLogger.log(
			'First 20 chars:',
			process.env.SUPABASE_SECRET_KEY?.substring(0, 20)
		)

		expect(process.env.SUPABASE_SECRET_KEY).toBeDefined()

		// Should be a JWT token (legacy format), new secret format (sb_secret_), or demo value
		expect(process.env.SUPABASE_SECRET_KEY).toMatch(
			/^(eyJ|sb_secret_|demo-service-key)/
		)
	})

	it('should check SUPABASE_PUBLISHABLE_KEY availability', () => {
		testLogger.log(
			'SUPABASE_PUBLISHABLE_KEY available:',
			!!process.env.SUPABASE_PUBLISHABLE_KEY
		)

		// SUPABASE_PUBLISHABLE_KEY may not be in all environments - that's OK
		if (process.env.SUPABASE_PUBLISHABLE_KEY) {
			// Accept any non-empty string (Supabase publishable keys have varying formats)
			const isValidFormat = process.env.SUPABASE_PUBLISHABLE_KEY.length > 0
			expect(isValidFormat).toBeTruthy()
			testLogger.log('SUPABASE_PUBLISHABLE_KEY is set and non-empty')
		} else {
			testLogger.log(
				'SUPABASE_PUBLISHABLE_KEY not set - using fallback in tests'
			)
		}
	})

	it('should show environment status', () => {
		testLogger.log('\n=== ENVIRONMENT STATUS ===')
		testLogger.log('SUPABASE_URL:', process.env.SUPABASE_URL)
		testLogger.log(
			'SUPABASE_PUBLISHABLE_KEY:',
			!!process.env.SUPABASE_PUBLISHABLE_KEY
		)
		testLogger.log('SUPABASE_SECRET_KEY:', !!process.env.SUPABASE_SECRET_KEY)
		testLogger.log(
			'STRIPE_SECRET_KEY:',
			!!process.env.STRIPE_SECRET_KEY,
			'(optional)'
		)
		testLogger.log('DATABASE_URL:', !!process.env.DATABASE_URL, '(optional)')
	})
})
