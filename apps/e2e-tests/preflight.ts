#!/usr/bin/env npx tsx
/**
 * E2E Test Preflight Checks
 *
 * Runs before E2E tests to validate environment and servers.
 * Provides clear error messages for common configuration issues.
 *
 * Usage:
 *   npx tsx preflight.ts
 *   # Or via package.json: "pretest": "npx tsx preflight.ts"
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'Preflight' })

interface CheckResult {
	name: string
	passed: boolean
	error?: string
	suggestion?: string
}

const results: CheckResult[] = []

/**
 * Check required environment variables
 */
function checkEnvironmentVariables(): void {
	const required = [
		{ name: 'E2E_OWNER_EMAIL', description: 'Owner test account email' },
		{ name: 'E2E_OWNER_PASSWORD', description: 'Owner test account password' }
	]

	const optional = [
		{
			name: 'E2E_TENANT_EMAIL',
			description: 'Tenant test account email (created via invitation)'
		},
		{
			name: 'E2E_TENANT_PASSWORD',
			description: 'Tenant test account password'
		},
		{
			name: 'PLAYWRIGHT_BASE_URL',
			description: 'Frontend URL (defaults to http://localhost:3050)'
		}
	]

	const supabase = [
		{
			name: 'NEXT_PUBLIC_SUPABASE_URL',
			alt: 'TEST_SUPABASE_URL',
			description: 'Supabase project URL'
		},
		{
			name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
			alt: 'TEST_SUPABASE_PUBLISHABLE_KEY',
			description: 'Supabase anon/public key'
		}
	]

	// Check required vars
	for (const { name, description } of required) {
		const value = process.env[name]
		results.push({
			name: `Env: ${name}`,
			passed: !!value,
			error: value ? undefined : `Missing required variable: ${name}`,
			suggestion: value
				? undefined
				: `Set ${name} in Doppler or .env file. ${description}`
		})
	}

	// Check Supabase vars (either main or TEST_ prefix)
	for (const { name, alt, description } of supabase) {
		const value = process.env[name] || process.env[alt]
		results.push({
			name: `Env: ${name}`,
			passed: !!value,
			error: value ? undefined : `Missing Supabase variable: ${name} or ${alt}`,
			suggestion: value ? undefined : `Set ${name} or ${alt}. ${description}`
		})
	}

	// Check optional vars (warn only)
	for (const { name, description } of optional) {
		const value = process.env[name]
		if (!value) {
			logger.warn(`Optional env var not set: ${name} - ${description}`)
		}
	}
}

/**
 * Check if a server is reachable
 */
async function checkServer(url: string, name: string): Promise<void> {
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 5000)

		const response = await fetch(url, {
			method: 'GET',
			signal: controller.signal
		})

		clearTimeout(timeout)

		results.push({
			name: `Server: ${name}`,
			passed: response.ok || response.status === 401, // 401 is OK - means server is up but needs auth
			error:
				response.ok || response.status === 401
					? undefined
					: `Server returned ${response.status}`,
			suggestion: `Ensure ${name} is running and accessible at ${url}`
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		results.push({
			name: `Server: ${name}`,
			passed: false,
			error: `Cannot reach ${name}: ${message}`,
			suggestion: `Start the server with: doppler run -- pnpm --filter @repo/${name === 'Backend' ? 'backend' : 'frontend'} dev`
		})
	}
}

/**
 * Check servers are reachable
 */
async function checkServers(): Promise<void> {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const backendUrl = 'http://localhost:4600/api/v1/security/health'

	await Promise.all([
		checkServer(baseUrl, 'Frontend'),
		checkServer(backendUrl, 'Backend')
	])
}

/**
 * Print results
 */
function printResults(): boolean {
	console.log('\n' + '='.repeat(60))
	console.log('E2E PREFLIGHT CHECK RESULTS')
	console.log('='.repeat(60) + '\n')

	let allPassed = true

	for (const result of results) {
		const status = result.passed ? '✅' : '❌'
		console.log(`${status} ${result.name}`)

		if (!result.passed) {
			allPassed = false
			if (result.error) {
				console.log(`   Error: ${result.error}`)
			}
			if (result.suggestion) {
				console.log(`   Fix: ${result.suggestion}`)
			}
		}
	}

	console.log('\n' + '='.repeat(60))

	if (allPassed) {
		console.log('✅ All preflight checks passed! Ready to run tests.')
	} else {
		console.log(
			'❌ Some checks failed. Fix the issues above before running tests.'
		)
	}

	console.log('='.repeat(60) + '\n')

	return allPassed
}

/**
 * Main
 */
async function main(): Promise<void> {
	console.log('\n🔍 Running E2E preflight checks...\n')

	// Run checks
	checkEnvironmentVariables()
	await checkServers()

	// Print results
	const allPassed = printResults()

	// Exit with error code if any checks failed
	if (!allPassed) {
		process.exit(1)
	}
}

main().catch(error => {
	console.error('Preflight check crashed:', error)
	process.exit(1)
})
