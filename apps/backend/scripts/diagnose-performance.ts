#!/usr/bin/env tsx
/**
 * Performance Diagnostic Script
 *
 * Tests all major API endpoints and measures response times
 * Identifies performance bottlenecks (>1000ms)
 */

import { Logger } from '@nestjs/common'

const API_BASE_URL = 'http://localhost:4600'
const logger = new Logger('PerformanceDiagnostic')

interface EndpointTest {
	method: string
	path: string
	requiresAuth: boolean
	description: string
}

const endpoints: EndpointTest[] = [
	{
		method: 'GET',
		path: '/health',
		requiresAuth: false,
		description: 'Health check'
	},
	{
		method: 'GET',
		path: '/api/v1/properties',
		requiresAuth: true,
		description: 'List properties'
	},
	{
		method: 'GET',
		path: '/api/v1/units',
		requiresAuth: true,
		description: 'List units'
	},
	{
		method: 'GET',
		path: '/api/v1/tenants',
		requiresAuth: true,
		description: 'List tenants'
	},
	{
		method: 'GET',
		path: '/api/v1/leases',
		requiresAuth: true,
		description: 'List leases'
	},
	{
		method: 'GET',
		path: '/api/v1/dashboard',
		requiresAuth: true,
		description: 'Dashboard stats'
	},
	{
		method: 'GET',
		path: '/api/v1/financial/analytics',
		requiresAuth: true,
		description: 'Financial analytics'
	},
	{
		method: 'GET',
		path: '/api/v1/maintenance',
		requiresAuth: true,
		description: 'Maintenance requests'
	}
]

interface TestResult {
	path: string
	description: string
	duration: number
	status: number
	error?: string
}

async function testEndpoint(
	endpoint: EndpointTest,
	authToken?: string
): Promise<TestResult> {
	const start = performance.now()

	try {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		}

		if (endpoint.requiresAuth && authToken) {
			headers['Authorization'] = `Bearer ${authToken}`
		}

		const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
			method: endpoint.method,
			headers
		})

		const duration = performance.now() - start

		return {
			path: endpoint.path,
			description: endpoint.description,
			duration: Math.round(duration),
			status: response.status
		}
	} catch (error) {
		const duration = performance.now() - start
		return {
			path: endpoint.path,
			description: endpoint.description,
			duration: Math.round(duration),
			status: 0,
			error: error instanceof Error ? error.message : String(error)
		}
	}
}

async function main() {
	logger.log('SEARCH PERFORMANCE DIAGNOSTIC TOOL')
	logger.log('='.repeat(80))
	logger.log('')

	const authToken = process.env.TEST_AUTH_TOKEN || ''

	if (!authToken) {
		logger.warn(
			'WARNING  No TEST_AUTH_TOKEN provided - authenticated endpoints will fail'
		)
		logger.warn('')
	}

	const results: TestResult[] = []

	for (const endpoint of endpoints) {
		const result = await testEndpoint(endpoint, authToken)
		results.push(result)

		const statusIcon =
			result.status >= 200 && result.status < 300 ? 'SUCCESS' : 'ERROR'
		const speedIcon =
			result.duration > 1000
				? 'SLOW'
				: result.duration > 500
					? 'WARNING'
					: 'FAST'

		logger.log(`${statusIcon} ${speedIcon} [${result.status}] ${result.path}`)
		logger.log(`   ${result.description}`)
		logger.log(`   Duration: ${result.duration}ms`)

		if (result.error) {
			logger.error(`   Error: ${result.error}`)
		}

		logger.log('')
	}

	logger.log('='.repeat(80))
	logger.log('SUMMARY')
	logger.log('='.repeat(80))

	const slow = results.filter(r => r.duration > 1000)
	const medium = results.filter(r => r.duration > 500 && r.duration <= 1000)
	const fast = results.filter(r => r.duration <= 500)

	logger.log(`FAST Fast (<500ms): ${fast.length}`)
	logger.log(`WARNING  Medium (500-1000ms): ${medium.length}`)
	logger.log(`SLOW SLOW (>1000ms): ${slow.length}`)
	logger.log('')

	if (slow.length > 0) {
		logger.warn('🚨 PERFORMANCE BOTTLENECKS DETECTED:')
		slow.forEach(r => {
			logger.warn(`   - ${r.path}: ${r.duration}ms (${r.description})`)
		})
		logger.log('')
	}

	const avgDuration =
		results.reduce((sum, r) => sum + r.duration, 0) / results.length
	logger.log(`ANALYTICS Average response time: ${Math.round(avgDuration)}ms`)
	logger.log('')
}
main().catch(error => {
	logger.error(
		'Performance diagnostic failed',
		error instanceof Error ? error.stack : String(error)
	)
	process.exit(1)
})
