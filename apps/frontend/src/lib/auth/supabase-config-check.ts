import { logger } from '@/lib/logger/structured-logger'

/**
 * Basic Supabase configuration checker
 * For comprehensive health checks, use auth-health-check.ts
 *
 * This checker validates environment variables and provides
 * recommendations for Supabase Dashboard configuration.
 * The auth-health-check.ts module performs actual API testing.
 * Run this during app initialization to ensure proper setup
 */
export class SupabaseConfigChecker {
	private static instance: SupabaseConfigChecker
	private configValid = false
	private issues: string[] = []

	private constructor() {
		// Private constructor for singleton pattern
		// Initialization happens in getInstance() method
	}

	static getInstance(): SupabaseConfigChecker {
		if (!SupabaseConfigChecker.instance) {
			SupabaseConfigChecker.instance = new SupabaseConfigChecker()
		}
		return SupabaseConfigChecker.instance
	}

	/**
	 * Validate Supabase configuration
	 */
	async validateConfiguration(): Promise<{
		valid: boolean
		issues: string[]
		recommendations: string[]
	}> {
		this.issues = []
		const recommendations: string[] = []

		// Check environment variables
		this.checkEnvironmentVariables()

		// Check redirect URLs
		this.checkRedirectUrls()

		// Generate recommendations
		recommendations.push(...this.generateRecommendations())

		this.configValid = this.issues.length === 0

		if (!this.configValid) {
			logger.error(
				'Supabase configuration issues detected',
				new Error('Configuration validation failed'),
				{
					component: 'SupabaseConfigChecker',
					issues: this.issues
				}
			)
		} else {
			logger.info('Supabase configuration validated successfully', {
				component: 'SupabaseConfigChecker'
			})
		}

		return {
			valid: this.configValid,
			issues: this.issues,
			recommendations
		}
	}

	/**
	 * Check required environment variables
	 */
	private checkEnvironmentVariables(): void {
		const required = [
			'NEXT_PUBLIC_SUPABASE_URL',
			'NEXT_PUBLIC_SUPABASE_ANON_KEY',
			'NEXT_PUBLIC_SITE_URL'
		]

		for (const envVar of required) {
			if (!process.env[envVar]) {
				this.issues.push(
					`Missing required environment variable: ${envVar}`
				)
			}
		}

		// Validate Supabase URL format
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
			this.issues.push('Invalid Supabase URL format')
		}

		// Validate anon key format (should be a JWT)
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		if (anonKey && anonKey.split('.').length !== 3) {
			this.issues.push(
				'Invalid Supabase anon key format (should be a JWT)'
			)
		}
	}

	/**
	 * Check redirect URLs configuration
	 */
	private checkRedirectUrls(): void {
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

		if (!siteUrl) {
			this.issues.push('NEXT_PUBLIC_SITE_URL not configured')
			return
		}

		// Check for localhost in production
		if (
			process.env.NODE_ENV === 'production' &&
			siteUrl.includes('localhost')
		) {
			this.issues.push('Production site URL should not use localhost')
		}

		// Check for HTTPS in production
		if (
			process.env.NODE_ENV === 'production' &&
			!siteUrl.startsWith('https://')
		) {
			this.issues.push('Production site URL should use HTTPS')
		}
	}

	/**
	 * Generate configuration recommendations
	 */
	private generateRecommendations(): string[] {
		const recommendations: string[] = []

		// Supabase Dashboard Settings
		recommendations.push(
			'📧 Email Templates: Ensure all email templates are configured in Supabase Dashboard',
			'🔗 Redirect URLs: Add these URLs to Supabase Auth settings:',
			`   - Site URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}`,
			`   - Callback: ${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
			`   - Error: ${process.env.NEXT_PUBLIC_SITE_URL}/auth/error`,
			'🔒 Security Settings:',
			'   - Enable email confirmation: Required for production',
			'   - Set minimum password length: 8 characters recommended',
			'   - Configure session timeout: 7 days recommended',
			'   - Enable RLS on all tables',
			'🔑 OAuth Providers:',
			'   - Google: Configure OAuth credentials in Supabase Dashboard',
			'   - Add authorized redirect URIs in Google Cloud Console',
			'📊 Monitoring:',
			'   - Enable Auth logs in Supabase Dashboard',
			'   - Set up alerts for failed auth attempts',
			'   - Monitor rate limits and adjust if needed'
		)

		return recommendations
	}

	/**
	 * Get current configuration status
	 */
	getStatus(): {
		valid: boolean
		issues: string[]
		environment: string
		urls: {
			supabase: string | undefined
			site: string | undefined
			callback: string | undefined
		}
	} {
		return {
			valid: this.configValid,
			issues: this.issues,
			environment: process.env.NODE_ENV || 'development',
			urls: {
				supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
				site: process.env.NEXT_PUBLIC_SITE_URL,
				callback: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
			}
		}
	}

	/**
	 * Log configuration report
	 */
	logConfigurationReport(): void {
		const status = this.getStatus()

		// Log configuration status with appropriate level based on validity
		if (status.valid) {
			logger.info('Supabase authentication configuration check completed', {
				component: 'SupabaseConfigChecker',
				environment: status.environment,
				valid: status.valid,
				urls: {
					supabase: status.urls.supabase || 'NOT_SET',
					site: status.urls.site || 'NOT_SET',
					callback: status.urls.callback || 'NOT_SET'
				}
			})
		} else {
			logger.warn('Supabase authentication configuration issues detected', {
				component: 'SupabaseConfigChecker',
				environment: status.environment,
				valid: status.valid,
				issues: status.issues,
				urls: {
					supabase: status.urls.supabase || 'NOT_SET',
					site: status.urls.site || 'NOT_SET',
					callback: status.urls.callback || 'NOT_SET'
				}
			})

			// Log each issue as a separate warning for better visibility
			status.issues.forEach(issue => {
				logger.warn(`Configuration issue: ${issue}`, {
					component: 'SupabaseConfigChecker',
					issue,
					environment: status.environment
				})
			})
		}

		// Log URL configuration details at debug level
		logger.debug('Supabase URL configuration details', {
			component: 'SupabaseConfigChecker',
			supabaseUrl: status.urls.supabase || 'NOT_SET',
			siteUrl: status.urls.site || 'NOT_SET',
			callbackUrl: status.urls.callback || 'NOT_SET',
			environment: status.environment
		})
	}
}

// Export singleton instance
export const supabaseConfigChecker = SupabaseConfigChecker.getInstance()

/**
 * Run configuration check (call during app initialization)
 */
export async function checkSupabaseConfiguration(): Promise<void> {
	const result = await supabaseConfigChecker.validateConfiguration()

	// Log report in development
	if (process.env.NODE_ENV === 'development') {
		supabaseConfigChecker.logConfigurationReport()

		if (result.recommendations.length > 0) {
			logger.debug('Supabase configuration recommendations', {
				component: 'SupabaseConfigChecker',
				recommendationCount: result.recommendations.length,
				recommendations: result.recommendations
			})
			
			// Log each recommendation separately for better readability in development
			result.recommendations.forEach((rec, index) => {
				logger.debug(`Recommendation ${index + 1}: ${rec}`, {
					component: 'SupabaseConfigChecker',
					recommendationIndex: index + 1,
					recommendation: rec
				})
			})
		}
	}
}
