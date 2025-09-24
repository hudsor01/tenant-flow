#!/usr/bin/env tsx

/**
 * CLI tool to run auth health check
 * Usage: pnpm auth:health
 */

import type { HealthCheckResponse } from '@repo/shared'
import { logger } from '@repo/shared'

// Environment variables are loaded via Doppler when script is run with 'doppler run --'

async function runHealthCheck() {
	logger.info('Running Supabase Auth Health Check...\n')

	const baseUrl =
		process.env.NEXT_PUBLIC_SITE_URL || (() => {
			throw new Error('NEXT_PUBLIC_SITE_URL is required for auth health check')
		})()
	// Backend exposes auth health at /api/v1/auth/health
	const healthUrl = `${baseUrl}/api/v1/auth/health`

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
		logger.info(`Version: ${data.version}`)
		logger.info(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`)
		logger.info(`Uptime: ${Math.floor(data.uptime / 60)} minutes`)
		logger.info('\nSystem Services:')

		// Display each service status
		Object.entries(data.services).forEach(([serviceName, status]) => {
			const icon = status === 'up' ? '[OK]' : '[ERROR]'
			const displayName =
				serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
			logger.info(`  ${icon} ${displayName}: ${status.toUpperCase()}`)
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
		logger.error(
			`ERROR: Health check failed: ${error instanceof Error ? error.message : String(error)}`
		)
		logger.error('\nMake sure the Next.js development server is running:')
		logger.error('  pnpm dev')
		process.exit(1)
	}
}

// Run the check
runHealthCheck().catch(error => logger.error(error))
