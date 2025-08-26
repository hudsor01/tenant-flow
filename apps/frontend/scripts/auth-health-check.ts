#!/usr/bin/env tsx

/**
 * CLI tool to run auth health check
 * Usage: npm run auth:health
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function runHealthCheck() {
	console.log('🔍 Running Supabase Auth Health Check...\n')

	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://api.tenantflow.app'
	const healthUrl = `${baseUrl}/api/auth/health`

	try {
		const response = await fetch(healthUrl, {
			headers: {
				Accept: 'application/json',
				...(process.env.AUTH_HEALTH_CHECK_TOKEN && {
					Authorization: `Bearer ${process.env.AUTH_HEALTH_CHECK_TOKEN}`
				})
			}
		})

		if (!response.ok) {
			throw new Error(`Health check returned ${response.status}`)
		}

		const data = await response.json()

		// Display results
		console.log('='.repeat(60))
		console.log('AUTH HEALTH CHECK RESULTS')
		console.log('='.repeat(60))
		console.log(`Overall Status: ${data.overall.toUpperCase()}`)
		console.log(`Environment: ${data.environment}`)
		console.log(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`)
		console.log('\nSystem Checks:')

		Object.entries(data.checks).forEach(([name, check]: [string, any]) => {
			const icon =
				check.status === 'pass'
					? '✅'
					: check.status === 'warn'
						? '⚠️'
						: '❌'
			const displayName = name.replace(/([A-Z])/g, ' $1').trim()
			console.log(`  ${icon} ${displayName}: ${check.message}`)

			if (check.details && process.env.VERBOSE) {
				console.log(
					`     Details: ${JSON.stringify(check.details, null, 2)}`
				)
			}
		})

		if (data.recommendations.length > 0) {
			console.log('\n📋 Recommendations:')
			data.recommendations.forEach((rec: string) => {
				console.log(`  ${rec}`)
			})
		}

		console.log('\n' + '='.repeat(60))

		// Exit with appropriate code
		if (data.overall === 'unhealthy') {
			console.error(
				'\n❌ Auth system is unhealthy. Please address the issues above.'
			)
			process.exit(1)
		} else if (data.overall === 'degraded') {
			console.warn(
				'\n⚠️  Auth system is degraded. Consider addressing the warnings.'
			)
			process.exit(0)
		} else {
			console.log('\n✅ Auth system is healthy!')
			process.exit(0)
		}
	} catch (error) {
		console.error('❌ Health check failed:', error)
		console.error('\nMake sure the Next.js development server is running:')
		console.error('  npm run dev')
		process.exit(1)
	}
}

// Run the check
runHealthCheck().catch(console.error)
