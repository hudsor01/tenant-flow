#!/usr/bin/env tsx

/**
 * CLI tool to run auth health check
 * Usage: npm run auth:health
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { logger } from '@repo/shared'

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
	logger.info('Running Supabase Auth Health Check...\n')

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
		logger.info('='.repeat(60))
		logger.info('AUTH HEALTH CHECK RESULTS')
		logger.info('='.repeat(60))
		logger.info(`Overall Status: ${data.status.toUpperCase()}`)
		logger.info(`Environment: ${data.environment}`)
		logger.info(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`)
		logger.info('\nSystem Checks:')

		Object.entries(data.checks).forEach(([name, isHealthy]) => {
			const icon = isHealthy ? '[OK]' : '[ERROR]'
			const displayName = name.replace(/([A-Z_])/g, ' $1').trim()
			logger.info(
				`  ${icon} ${displayName}: ${isHealthy ? 'PASS' : 'FAIL'}`
			)
		})

		logger.info('\n' + '='.repeat(60))

		// Exit with appropriate code
		if (data.status === 'unhealthy') {
			logger.error(
				'\nERROR: Auth system is unhealthy. Please address the issues above.'
			)
			process.exit(1)
		} else {
			logger.info('\nSUCCESS: Auth system is healthy!')
			process.exit(0)
		}
	} catch (error) {
		logger.error('ERROR: Health check failed:', error)
		logger.error('\nMake sure the Next.js development server is running:')
		logger.error('  npm run dev')
		process.exit(1)
	}
}

// Run the check
runHealthCheck().catch((error) => logger.error(error))
