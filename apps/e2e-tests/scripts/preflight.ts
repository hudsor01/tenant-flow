#!/usr/bin/env npx tsx
/**
 * Preflight Check for E2E Tests
 *
 * Run before E2E tests to validate environment and catch issues early.
 *
 * Usage:
 *   doppler run -- npx tsx scripts/preflight.ts
 *   doppler run -- pnpm preflight
 */

interface CheckResult {
	name: string
	status: 'pass' | 'fail' | 'warn'
	message: string
}

const results: CheckResult[] = []

function check(name: string, condition: boolean, failMessage: string, warnOnly = false): void {
	if (condition) {
		results.push({ name, status: 'pass', message: 'OK' })
	} else {
		results.push({
			name,
			status: warnOnly ? 'warn' : 'fail',
			message: failMessage,
		})
	}
}

async function checkUrl(name: string, url: string, warnOnly = false): Promise<void> {
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 5000)
		const response = await fetch(url, { signal: controller.signal })
		clearTimeout(timeout)
		check(name, response.ok || response.status < 500, `${url} returned ${response.status}`, warnOnly)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		check(name, false, `${url} unreachable: ${message}`, warnOnly)
	}
}

async function main(): Promise<void> {
	console.log('\n🔍 E2E Test Preflight Check\n')
	console.log('=' .repeat(60))

	// === Required Environment Variables ===
	console.log('\n📋 Environment Variables\n')

	check(
		'E2E_OWNER_EMAIL',
		!!process.env.E2E_OWNER_EMAIL,
		'Missing E2E_OWNER_EMAIL - set in Doppler or .env'
	)

	check(
		'E2E_OWNER_PASSWORD',
		!!process.env.E2E_OWNER_PASSWORD,
		'Missing E2E_OWNER_PASSWORD - set in Doppler or .env'
	)

	check(
		'NEXT_PUBLIC_SUPABASE_URL',
		!!process.env.NEXT_PUBLIC_SUPABASE_URL,
		'Missing NEXT_PUBLIC_SUPABASE_URL - required for auth'
	)

	check(
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
		!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY - required for auth'
	)

	// Optional but useful
	check(
		'E2E_TENANT_EMAIL',
		!!process.env.E2E_TENANT_EMAIL,
		'Missing - tenant portal tests will be skipped',
		true // warn only
	)

	// === Supabase Auth Check ===
	console.log('\n🔐 Supabase Authentication\n')

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	const email = process.env.E2E_OWNER_EMAIL
	const password = process.env.E2E_OWNER_PASSWORD

	if (supabaseUrl && supabaseKey && email && password) {
		try {
			const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
				method: 'POST',
				headers: {
					'apikey': supabaseKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			})

			if (response.ok) {
				const data = await response.json()
				check('Supabase Auth', true, 'OK')
				check('User ID present', !!data.user?.id, 'Auth succeeded but no user ID returned')
			} else {
				const error = await response.text()
				check('Supabase Auth', false, `Login failed: ${error}`)
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			check('Supabase Auth', false, `Auth request failed: ${message}`)
		}
	} else {
		check('Supabase Auth', false, 'Skipped - missing env vars')
	}

	// === Server Connectivity (optional - webServer will start them) ===
	console.log('\n🌐 Server Connectivity (optional - Playwright auto-starts)\n')

	const frontendUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4650'

	await checkUrl('Frontend', frontendUrl, true)
	await checkUrl('Backend Health', `${backendUrl}/health/ping`, true)

	// === Print Results ===
	console.log('\n' + '=' .repeat(60))
	console.log('\n📊 Results\n')

	let passed = 0
	let failed = 0
	let warned = 0

	for (const result of results) {
		const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌'
		const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m'
		const reset = '\x1b[0m'
		console.log(`${icon} ${color}${result.name}${reset}: ${result.message}`)

		if (result.status === 'pass') passed++
		else if (result.status === 'warn') warned++
		else failed++
	}

	console.log('\n' + '=' .repeat(60))
	console.log(`\n✅ Passed: ${passed}  ⚠️  Warnings: ${warned}  ❌ Failed: ${failed}\n`)

	if (failed > 0) {
		console.log('❌ Preflight checks failed. Fix the issues above before running tests.\n')
		console.log('📖 See TESTING.md for setup instructions.\n')
		process.exit(1)
	} else if (warned > 0) {
		console.log('⚠️  Some checks have warnings. Tests may skip certain scenarios.\n')
		process.exit(0)
	} else {
		console.log('✅ All preflight checks passed. Ready to run tests!\n')
		process.exit(0)
	}
}

main().catch((error) => {
	console.error('Preflight script error:', error)
	process.exit(1)
})
