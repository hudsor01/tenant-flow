#!/usr/bin/env ts-node
/**
 * Supabase Key Validation Script
 *
 * This script validates that your Supabase credentials are correct by:
 * 1. Checking that environment variables are set
 * 2. Attempting to connect to Supabase
 * 3. Running a simple query to verify the key works
 *
 * Usage:
 *   pnpm tsx apps/backend/scripts/validate-supabase-keys.ts
 */

import { createClient } from '@supabase/supabase-js'

interface ValidationResult {
	step: string
	status: 'pass' | 'fail'
	message: string
	details?: Record<string, unknown>
}

async function validateSupabaseKeys(): Promise<void> {
	const results: ValidationResult[] = []

	console.log('🔍 Validating Supabase Configuration...\n')

	// Step 1: Check environment variables
	const url = process.env.SUPABASE_URL
	const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
	const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
	const projectRef = process.env.PROJECT_REF

	if (!url) {
		results.push({
			step: 'Environment Variables',
			status: 'fail',
			message: 'SUPABASE_URL is not set'
		})
	} else if (!secretKey) {
		results.push({
			step: 'Environment Variables',
			status: 'fail',
			message: 'SUPABASE_SERVICE_ROLE_KEY is not set'
		})
	} else {
		results.push({
			step: 'Environment Variables',
			status: 'pass',
			message: 'All required environment variables are set',
			details: {
				SUPABASE_URL: url.substring(0, 35) + '...',
				SUPABASE_SERVICE_ROLE_KEY: secretKey.substring(0, 20) + '...',
				SUPABASE_PUBLISHABLE_KEY: publishableKey
					? publishableKey.substring(0, 20) + '...'
					: 'not set',
				PROJECT_REF: projectRef || 'not set'
			}
		})
	}

	// Step 2: Validate URL format
	if (url) {
		try {
			const urlObj = new URL(url)
			if (!urlObj.hostname.includes('supabase')) {
				results.push({
					step: 'URL Format',
					status: 'fail',
					message: 'URL does not appear to be a Supabase URL',
					details: { hostname: urlObj.hostname }
				})
			} else {
				results.push({
					step: 'URL Format',
					status: 'pass',
					message: 'URL format is valid',
					details: { hostname: urlObj.hostname }
				})
			}
		} catch (error) {
			results.push({
				step: 'URL Format',
				status: 'fail',
				message: 'Invalid URL format',
				details: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
		}
	}

	// Step 3: Validate key format
	if (secretKey) {
		if (!secretKey.startsWith('eyJ')) {
			results.push({
				step: 'Secret Key Format',
				status: 'fail',
				message:
					'Secret key does not appear to be a valid JWT (should start with "eyJ")',
				details: { prefix: secretKey.substring(0, 10) }
			})
		} else {
			results.push({
				step: 'Secret Key Format',
				status: 'pass',
				message: 'Secret key format appears valid (JWT format)'
			})
		}
	}

	// Step 4: Test connection with admin client
	if (url && secretKey) {
		try {
			console.log('📡 Testing connection to Supabase...')
			const client = createClient(url, secretKey, {
				auth: {
					persistSession: false,
					autoRefreshToken: false,
					detectSessionInUrl: false
				}
			})

			// Try to query a table (users is a common table)
			const { error } = await client
				.from('users')
				.select('id', { count: 'exact', head: true })
				.limit(1)

			if (error) {
				const errorMessage = error.message || JSON.stringify(error)
				const errorStr = errorMessage.toLowerCase()

				if (
					errorStr.includes('unregistered api key') ||
					errorStr.includes('invalid api key')
				) {
					results.push({
						step: 'Connection Test',
						status: 'fail',
						message: 'ERROR API key is not registered for this project',
						details: {
							error: errorMessage,
							hint: 'The SUPABASE_SERVICE_ROLE_KEY does not match the SUPABASE_URL project. Check that you are using the correct key from your Supabase project settings.'
						}
					})
				} else if (
					errorStr.includes('relation') &&
					errorStr.includes('does not exist')
				) {
					results.push({
						step: 'Connection Test',
						status: 'pass',
						message:
							'SUCCESS Connection successful (table does not exist, but key is valid)',
						details: {
							note: 'The "users" table does not exist in your database, but the API key is valid'
						}
					})
				} else {
					results.push({
						step: 'Connection Test',
						status: 'fail',
						message: 'Connection failed with error',
						details: { error: errorMessage }
					})
				}
			} else {
				results.push({
					step: 'Connection Test',
					status: 'pass',
					message: 'SUCCESS Connection successful and query executed',
					details: { note: 'Successfully queried the users table' }
				})
			}
		} catch (error) {
			results.push({
				step: 'Connection Test',
				status: 'fail',
				message: 'Connection test threw an exception',
				details: {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				}
			})
		}
	}

	// Print results
	console.log('\nANALYTICS Validation Results:\n')
	let allPassed = true

	for (const result of results) {
		const icon = result.status === 'pass' ? 'SUCCESS' : 'ERROR'
		console.log(`${icon} ${result.step}: ${result.message}`)
		if (result.details) {
			console.log('   Details:', JSON.stringify(result.details, null, 2))
		}
		console.log()

		if (result.status === 'fail') {
			allPassed = false
		}
	}

	// Summary
	if (allPassed) {
		console.log(
			'SUCCESS All validation checks passed! Your Supabase configuration is correct.\n'
		)
		process.exit(0)
	} else {
		console.log(
			'WARNING  Some validation checks failed. Please review the errors above.\n'
		)
		console.log('TIP Common fixes:')
		console.log(
			'   1. Make sure you are running with pnpm dev'
		)
		console.log(
			'   2. Check that SUPABASE_SERVICE_ROLE_KEY matches your SUPABASE_URL project'
		)
		console.log(
			'   3. Verify the key in your Supabase project settings: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api'
		)
		console.log()
		process.exit(1)
	}
}

// Run validation
validateSupabaseKeys().catch(error => {
	console.error('ERROR Validation script failed:', error)
	process.exit(1)
})
