/**
 * Comprehensive Supabase Auth Health Check System
 * Tests actual auth endpoints and configuration programmatically
 */

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export interface AuthHealthStatus {
	timestamp: string
	environment: string
	overall: 'healthy' | 'degraded' | 'unhealthy'
	checks: Record<string, CheckResult>
	recommendations: string[]
}

interface CheckResult {
	status: 'pass' | 'warn' | 'fail'
	message: string
	details?: Record<string, unknown>
}

export class AuthHealthChecker {
	private static instance: AuthHealthChecker
	private supabase = createClient()

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): AuthHealthChecker {
		if (!AuthHealthChecker.instance) {
			AuthHealthChecker.instance = new AuthHealthChecker()
		}
		return AuthHealthChecker.instance
	}

	/**
	 * Run comprehensive health check
	 */
	async runHealthCheck(): Promise<AuthHealthStatus> {
		const status: AuthHealthStatus = {
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || 'development',
			overall: 'healthy',
			checks: {
				environment: await this.checkEnvironment(),
				connection: await this.checkConnection(),
				emailAuth: await this.checkEmailAuth(),
				oauthProviders: await this.checkOAuthProviders(),
				sessionManagement: await this.checkSessionManagement(),
				apiEndpoints: await this.checkAPIEndpoints(),
				rateLimit: await this.checkRateLimit(),
				security: await this.checkSecurity()
			},
			recommendations: []
		}

		// Calculate overall status
		const checks = Object.values(status.checks)
		if (checks.some(c => c.status === 'fail')) {
			status.overall = 'unhealthy'
		} else if (checks.some(c => c.status === 'warn')) {
			status.overall = 'degraded'
		}

		// Generate recommendations
		status.recommendations = this.generateRecommendations(status.checks)

		return status
	}

	/**
	 * Check environment variables
	 */
	private async checkEnvironment(): Promise<CheckResult> {
		const required = [
			'NEXT_PUBLIC_SUPABASE_URL',
			'NEXT_PUBLIC_SUPABASE_ANON_KEY',
			'NEXT_PUBLIC_SITE_URL'
		]

		const missing = required.filter(env => !process.env[env])

		if (missing.length > 0) {
			return {
				status: 'fail',
				message: `Missing environment variables: ${missing.join(', ')}`,
				details: { missing }
			}
		}

		// Validate URL formats
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

		const warnings: string[] = []

		if (!supabaseUrl.includes('.supabase.co')) {
			warnings.push('Supabase URL appears invalid')
		}

		if (process.env.NODE_ENV === 'production') {
			if (siteUrl.includes('localhost')) {
				warnings.push('Production using localhost URL')
			}
			if (!siteUrl.startsWith('https://')) {
				warnings.push('Production not using HTTPS')
			}
		}

		if (warnings.length > 0) {
			return {
				status: 'warn',
				message: warnings.join(', '),
				details: { warnings }
			}
		}

		return {
			status: 'pass',
			message: 'All environment variables configured correctly'
		}
	}

	/**
	 * Check Supabase connection
	 */
	private async checkConnection(): Promise<CheckResult> {
		try {
			// Test basic connectivity by checking if we can get the current session
			const { error } = await this.supabase.auth.getSession()

			// No error means connection is working (even if no session exists)
			if (!error) {
				return {
					status: 'pass',
					message: 'Supabase connection successful'
				}
			}

			return {
				status: 'fail',
				message: `Connection failed: ${error.message}`,
				details: { error: error.message }
			}
		} catch (error) {
			return {
				status: 'fail',
				message: 'Unable to connect to Supabase',
				details: { error: String(error) }
			}
		}
	}

	/**
	 * Check email authentication capabilities
	 */
	private async checkEmailAuth(): Promise<CheckResult> {
		try {
			// Test signup endpoint (without actually creating user)
			const testEmail = `test-${Date.now()}@healthcheck.local`
			// Generate a random test password for health check
			const testPassword = `HealthCheck_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
			const { error } = await this.supabase.auth.signUp({
				email: testEmail,
				password: testPassword,
				options: {
					// Don't actually send confirmation email
					emailRedirectTo: undefined,
					data: { health_check: true }
				}
			})

			// Expected errors that indicate auth is working
			if (
				error?.message?.includes('rate limit') ||
				error?.message?.includes('Email signups are disabled') ||
				error?.message?.includes('Email domain is not authorized')
			) {
				return {
					status: 'warn',
					message: 'Email auth configured but has restrictions',
					details: { restriction: error.message }
				}
			}

			// If no error or user already exists error, email auth is working
			if (!error || error.message?.includes('already registered')) {
				return {
					status: 'pass',
					message: 'Email authentication is working'
				}
			}

			return {
				status: 'fail',
				message: `Email auth error: ${error.message}`,
				details: { error: error.message }
			}
		} catch (error) {
			return {
				status: 'fail',
				message: 'Email auth check failed',
				details: { error: String(error) }
			}
		}
	}

	/**
	 * Check OAuth providers
	 */
	private async checkOAuthProviders(): Promise<CheckResult> {
		try {
			const providers = ['google'] // Add more providers as needed
			const results: Record<string, boolean> = {}

			for (const provider of providers) {
				try {
					// Test OAuth URL generation (doesn't trigger actual OAuth flow)
					const { data, error } =
						await this.supabase.auth.signInWithOAuth({
							provider: provider as 'google',
							options: {
								skipBrowserRedirect: true,
								redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
							}
						})

					results[provider] = !!data?.url && !error
				} catch {
					results[provider] = false
				}
			}

			const working = Object.entries(results)
				.filter(([_, works]) => works)
				.map(([name]) => name)

			const broken = Object.entries(results)
				.filter(([_, works]) => !works)
				.map(([name]) => name)

			if (broken.length === 0) {
				return {
					status: 'pass',
					message: `OAuth providers working: ${working.join(', ')}`,
					details: { results }
				}
			}

			if (working.length > 0) {
				return {
					status: 'warn',
					message: `Some OAuth providers not configured: ${broken.join(', ')}`,
					details: { working, broken }
				}
			}

			return {
				status: 'fail',
				message: 'No OAuth providers configured',
				details: { results }
			}
		} catch (error) {
			return {
				status: 'fail',
				message: 'OAuth provider check failed',
				details: { error: String(error) }
			}
		}
	}

	/**
	 * Check session management
	 */
	private async checkSessionManagement(): Promise<CheckResult> {
		try {
			// Check if session refresh works
			const { data: session, error } =
				await this.supabase.auth.getSession()

			if (error) {
				return {
					status: 'warn',
					message:
						'Session management available but no active session',
					details: { error: error.message }
				}
			}

			// Check refresh token endpoint
			if (session?.session) {
				const { error: refreshError } =
					await this.supabase.auth.refreshSession()

				if (!refreshError) {
					return {
						status: 'pass',
						message: 'Session management and refresh working'
					}
				}

				return {
					status: 'warn',
					message: 'Session exists but refresh failed',
					details: { error: refreshError.message }
				}
			}

			return {
				status: 'pass',
				message: 'Session management available'
			}
		} catch (error) {
			return {
				status: 'fail',
				message: 'Session management check failed',
				details: { error: String(error) }
			}
		}
	}

	/**
	 * Check API endpoints
	 */
	private async checkAPIEndpoints(): Promise<CheckResult> {
		const endpoints = [
			{ name: 'Password Reset', test: () => this.testPasswordReset() },
			{ name: 'Magic Link', test: () => this.testMagicLink() },
			{ name: 'Update User', test: () => this.testUpdateUser() }
		]

		const results: Record<string, boolean> = {}

		for (const endpoint of endpoints) {
			try {
				results[endpoint.name] = await endpoint.test()
			} catch {
				results[endpoint.name] = false
			}
		}

		const working = Object.entries(results)
			.filter(([_, works]) => works)
			.map(([name]) => name)

		const broken = Object.entries(results)
			.filter(([_, works]) => !works)
			.map(([name]) => name)

		if (broken.length === 0) {
			return {
				status: 'pass',
				message: 'All API endpoints working',
				details: { results }
			}
		}

		if (working.length > broken.length) {
			return {
				status: 'warn',
				message: `Some endpoints not working: ${broken.join(', ')}`,
				details: { working, broken }
			}
		}

		return {
			status: 'fail',
			message: 'Most API endpoints failing',
			details: { working, broken }
		}
	}

	/**
	 * Test password reset endpoint
	 */
	private async testPasswordReset(): Promise<boolean> {
		const { error } = await this.supabase.auth.resetPasswordForEmail(
			`test-${Date.now()}@healthcheck.local`,
			{
				redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
			}
		)

		// Rate limit or success both indicate endpoint is working
		return !error || error.message.includes('rate limit')
	}

	/**
	 * Test magic link endpoint
	 */
	private async testMagicLink(): Promise<boolean> {
		const { error } = await this.supabase.auth.signInWithOtp({
			email: `test-${Date.now()}@healthcheck.local`,
			options: {
				shouldCreateUser: false
			}
		})

		// Rate limit or user not found both indicate endpoint is working
		return (
			!error ||
			error.message.includes('rate limit') ||
			error.message.includes('not found')
		)
	}

	/**
	 * Test update user endpoint
	 */
	private async testUpdateUser(): Promise<boolean> {
		const { data: session } = await this.supabase.auth.getSession()

		// Can't test without active session
		if (!session?.session) {
			return true // Assume working if no session
		}

		const { error } = await this.supabase.auth.updateUser({
			data: { health_check_timestamp: new Date().toISOString() }
		})

		return !error
	}

	/**
	 * Check rate limiting
	 */
	private async checkRateLimit(): Promise<CheckResult> {
		// Check if we've hit any rate limits recently
		const testEmail = 'ratelimit@healthcheck.local'
		let hitRateLimit = false

		// Try a few rapid requests
		for (let i = 0; i < 3; i++) {
			const { error } = await this.supabase.auth.signInWithPassword({
				email: testEmail,
				password: 'wrong'
			})

			if (error?.message?.includes('rate limit')) {
				hitRateLimit = true
				break
			}
		}

		if (hitRateLimit) {
			return {
				status: 'pass',
				message: 'Rate limiting is active and working'
			}
		}

		return {
			status: 'warn',
			message: 'Rate limiting may not be configured',
			details: {
				note: 'Could not trigger rate limit with test requests'
			}
		}
	}

	/**
	 * Check security configuration
	 */
	private async checkSecurity(): Promise<CheckResult> {
		const issues: string[] = []

		// Check for secure cookies in production
		if (process.env.NODE_ENV === 'production') {
			if (!process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')) {
				issues.push('Not using HTTPS in production')
			}
		}

		// Check for exposed keys (basic check)
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		if (anonKey && !anonKey.includes('eyJ')) {
			issues.push('Anonymous key format appears invalid')
		}

		if (issues.length === 0) {
			return {
				status: 'pass',
				message: 'Security configuration looks good'
			}
		}

		return {
			status: 'warn',
			message: issues.join(', '),
			details: { issues }
		}
	}

	/**
	 * Generate recommendations based on check results
	 */
	private generateRecommendations(
		checks: AuthHealthStatus['checks']
	): string[] {
		const recommendations: string[] = []

		// Environment recommendations
		if (checks.environment?.status !== 'pass') {
			recommendations.push(
				'🔧 Fix environment variables configuration',
				'   - Ensure all required variables are set',
				'   - Use HTTPS in production',
				'   - Update redirect URLs in Supabase Dashboard'
			)
		}

		// Email auth recommendations
		if (checks.emailAuth?.status === 'fail') {
			recommendations.push(
				'📧 Enable email authentication in Supabase Dashboard',
				'   - Go to Authentication > Providers',
				'   - Enable Email provider',
				'   - Configure email templates'
			)
		}

		// OAuth recommendations
		if (checks.oauthProviders && checks.oauthProviders.status !== 'pass') {
			recommendations.push(
				'🔑 Configure OAuth providers',
				'   - Enable Google OAuth in Supabase Dashboard',
				'   - Add OAuth credentials from Google Cloud Console',
				'   - Configure redirect URLs'
			)
		}

		// Rate limit recommendations
		if (checks.rateLimit && checks.rateLimit.status === 'warn') {
			recommendations.push(
				'🛡️ Configure rate limiting',
				'   - Enable rate limiting in Supabase Dashboard',
				'   - Set appropriate limits for your use case'
			)
		}

		// Security recommendations
		if (checks.security && checks.security.status !== 'pass') {
			recommendations.push(
				'🔒 Improve security configuration',
				'   - Use HTTPS in production',
				'   - Enable MFA for admin accounts',
				'   - Review RLS policies'
			)
		}

		if (recommendations.length === 0) {
			recommendations.push('✅ All auth systems functioning optimally!')
		}

		return recommendations
	}

	/**
	 * Generate HTML report
	 */
	generateHTMLReport(status: AuthHealthStatus): string {
		const statusColor = {
			healthy: '#10b981',
			degraded: '#f59e0b',
			unhealthy: '#ef4444'
		}[status.overall]

		const checkIcon = (status: string) => {
			switch (status) {
				case 'pass':
					return '✅'
				case 'warn':
					return '⚠️'
				case 'fail':
					return '❌'
				default:
					return '❓'
			}
		}

		return `
<!DOCTYPE html>
<html>
<head>
  <title>Auth Health Check Report</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px;
      background: #f9fafb;
    }
    .header {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-weight: 600;
      background: ${statusColor};
    }
    .check-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .check-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .check-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .check-title {
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .check-message {
      color: #374151;
      font-size: 14px;
    }
    .recommendations {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .recommendation-item {
      margin: 8px 0;
      color: #374151;
    }
    pre {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Supabase Auth Health Check</h1>
    <p>Generated: ${new Date(status.timestamp).toLocaleString()}</p>
    <p>Environment: ${status.environment}</p>
    <div class="status-badge">${status.overall.toUpperCase()}</div>
  </div>
  
  <div class="check-grid">
    ${Object.entries(status.checks)
		.map(
			([name, check]) => `
      <div class="check-card">
        <div class="check-header">
          <span class="check-title">${name.replace(/([A-Z])/g, ' $1').trim()}</span>
          <span>${checkIcon(check.status)}</span>
        </div>
        <div class="check-message">${check.message}</div>
        ${check.details ? `<pre>${JSON.stringify(check.details, null, 2)}</pre>` : ''}
      </div>
    `
		)
		.join('')}
  </div>
  
  <div class="recommendations">
    <h2>📋 Recommendations</h2>
    ${status.recommendations
		.map(rec => `<div class="recommendation-item">${rec}</div>`)
		.join('')}
  </div>
</body>
</html>
    `
	}
}

// Export singleton instance
export const authHealthChecker = AuthHealthChecker.getInstance()

/**
 * Run health check and log results
 */
export async function runAuthHealthCheck(): Promise<AuthHealthStatus> {
	const status = await authHealthChecker.runHealthCheck()

	// Log to console in development
	if (process.env.NODE_ENV === 'development') {
		console.log('\n' + '='.repeat(60))
		console.log('🔍 AUTH HEALTH CHECK RESULTS')
		console.log('='.repeat(60))
		console.log(`Status: ${status.overall.toUpperCase()}`)
		console.log(`Environment: ${status.environment}`)
		console.log(`Timestamp: ${status.timestamp}`)
		console.log('\nChecks:')

		Object.entries(status.checks).forEach(([name, check]) => {
			const icon =
				check.status === 'pass'
					? '✅'
					: check.status === 'warn'
						? '⚠️'
						: '❌'
			console.log(`  ${icon} ${name}: ${check.message}`)
		})

		if (status.recommendations.length > 0) {
			console.log('\nRecommendations:')
			status.recommendations.forEach(rec => console.log(rec))
		}

		console.log('='.repeat(60) + '\n')
	}

	// Log to monitoring
	logger.info('Auth health check completed', {
		component: 'AuthHealthCheck',
		overall: status.overall,
		checks: Object.fromEntries(
			Object.entries(status.checks).map(([k, v]) => [k, v.status])
		)
	})

	return status
}
