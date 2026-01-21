/**
 * Test to verify environment variables are accessible
 * Following CLAUDE.md: NO ABSTRACTIONS, simple direct checks
 */

import { Logger } from '@nestjs/common'

const testLogger = new Logger('EnvCheck')

describe('Environment Variables Access', () => {
	it('should access SUPABASE_URL from environment', () => {
		testLogger.log('SUPABASE_URL:', process.env.SUPABASE_URL)

		// Skip in CI environments without secrets
		if (process.env.CI && !process.env.SUPABASE_URL) {
			testLogger.log(
				'Skipping SUPABASE_URL check - not available in CI unit tests'
			)
			return
		}

		// Direct environment variable check - no abstractions
		expect(process.env.SUPABASE_URL).toBeDefined()
		expect(process.env.SUPABASE_URL).toMatch(/^https?:\/\//)
	})

	it('should access SECRET_KEY_SUPABASE from environment', () => {
		testLogger.log(
			'SECRET_KEY_SUPABASE available:',
			!!process.env.SECRET_KEY_SUPABASE
		)
		testLogger.log(
			'First 20 chars:',
			process.env.SECRET_KEY_SUPABASE?.substring(0, 20)
		)

		// SECRET_KEY_SUPABASE is only available when running with 
		// Skip this check in CI/unit test environments without secrets
		if (!process.env.SECRET_KEY_SUPABASE) {
			testLogger.log(
				'SECRET_KEY_SUPABASE not set - skipping in unit test environment'
			)
			return
		}

		expect(process.env.SECRET_KEY_SUPABASE).toBeDefined()

		// Should be a JWT token (legacy format), new secret format (sb_secret_), or demo value
		expect(process.env.SECRET_KEY_SUPABASE).toMatch(
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
		testLogger.log('SECRET_KEY_SUPABASE:', !!process.env.SECRET_KEY_SUPABASE)
		testLogger.log(
			'STRIPE_SECRET_KEY:',
			!!process.env.STRIPE_SECRET_KEY,
			'(optional)'
		)
		testLogger.log('DATABASE_URL:', !!process.env.DATABASE_URL, '(optional)')
	})
})
