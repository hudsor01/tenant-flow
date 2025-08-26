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

// Type definitions for health check response
interface HealthCheckResponse {
	status: 'healthy' | 'unhealthy'
	timestamp: string
	environment: string
	checks: {
		supabase_url: boolean
		supabase_key: boolean
	}
	error?: string
}

async function runHealthCheck() {
	console.log('🔍 Running Supabase Auth Health Check...\n')

	const baseUrl =
		process.env.NEXT_PUBLIC_SITE_URL || 'http://api.tenantflow.app'
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

		const data: HealthCheckResponse = await response.json()

		// Display results
		console.log('='.repeat(60))
		console.log('AUTH HEALTH CHECK RESULTS')
		console.log('='.repeat(60))
		console.log(`Overall Status: ${data.status.toUpperCase()}`)
		console.log(`Environment: ${data.environment}`)
		console.log(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`)
		console.log('\nSystem Checks:')

		Object.entries(data.checks).forEach(([name, isHealthy]) => {
			const icon = isHealthy ? '✅' : '❌'
			const displayName = name.replace(/([A-Z_])/g, ' $1').trim()
			console.log(
				`  ${icon} ${displayName}: ${isHealthy ? 'PASS' : 'FAIL'}`
			)
		})

		console.log('\n' + '='.repeat(60))

		// Exit with appropriate code
		if (data.status === 'unhealthy') {
			console.error(
				'\n❌ Auth system is unhealthy. Please address the issues above.'
			)
			process.exit(1)
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
