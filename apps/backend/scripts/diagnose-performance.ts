#!/usr/bin/env tsx
/**
 * Performance Diagnostic Script
 *
 * Tests all major API endpoints and measures response times
 * Identifies performance bottlenecks (>1000ms)
 */

const API_BASE_URL = 'http://localhost:4600'

interface EndpointTest {
	method: string
	path: string
	requiresAuth: boolean
	description: string
}

const endpoints: EndpointTest[] = [
	{ method: 'GET', path: '/health', requiresAuth: false, description: 'Health check' },
	{ method: 'GET', path: '/api/v1/properties', requiresAuth: true, description: 'List properties' },
	{ method: 'GET', path: '/api/v1/units', requiresAuth: true, description: 'List units' },
	{ method: 'GET', path: '/api/v1/tenants', requiresAuth: true, description: 'List tenants' },
	{ method: 'GET', path: '/api/v1/leases', requiresAuth: true, description: 'List leases' },
	{ method: 'GET', path: '/api/v1/dashboard', requiresAuth: true, description: 'Dashboard stats' },
	{ method: 'GET', path: '/api/v1/financial/analytics', requiresAuth: true, description: 'Financial analytics' },
	{ method: 'GET', path: '/api/v1/maintenance', requiresAuth: true, description: 'Maintenance requests' },
]

interface TestResult {
	path: string
	description: string
	duration: number
	status: number
	error?: string
}

async function testEndpoint(endpoint: EndpointTest, authToken?: string): Promise<TestResult> {
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
	console.log('🔍 PERFORMANCE DIAGNOSTIC TOOL')
	console.log('=' .repeat(80))
	console.log('')

	const authToken = process.env.TEST_AUTH_TOKEN || ''

	if (!authToken) {
		console.log('⚠️  No TEST_AUTH_TOKEN provided - authenticated endpoints will fail')
		console.log('')
	}

	const results: TestResult[] = []

	for (const endpoint of endpoints) {
		const result = await testEndpoint(endpoint, authToken)
		results.push(result)

		const statusIcon = result.status >= 200 && result.status < 300 ? '✅' : '❌'
		const speedIcon = result.duration > 1000 ? '🐌' : result.duration > 500 ? '⚠️' : '⚡'

		console.log(`${statusIcon} ${speedIcon} [${result.status}] ${result.path}`)
		console.log(`   ${result.description}`)
		console.log(`   Duration: ${result.duration}ms`)

		if (result.error) {
			console.log(`   Error: ${result.error}`)
		}

		console.log('')
	}

	console.log('=' .repeat(80))
	console.log('SUMMARY')
	console.log('=' .repeat(80))

	const slow = results.filter(r => r.duration > 1000)
	const medium = results.filter(r => r.duration > 500 && r.duration <= 1000)
	const fast = results.filter(r => r.duration <= 500)

	console.log(`⚡ Fast (<500ms): ${fast.length}`)
	console.log(`⚠️  Medium (500-1000ms): ${medium.length}`)
	console.log(`🐌 SLOW (>1000ms): ${slow.length}`)
	console.log('')

	if (slow.length > 0) {
		console.log('🚨 PERFORMANCE BOTTLENECKS DETECTED:')
		slow.forEach(r => {
			console.log(`   - ${r.path}: ${r.duration}ms (${r.description})`)
		})
		console.log('')
	}

	const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
	console.log(`📊 Average response time: ${Math.round(avgDuration)}ms`)
	console.log('')
}

main().catch(console.error)
