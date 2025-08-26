#!/usr/bin/env tsx
/**
 * Environment Configuration Validator
 * Validates all required environment variables before deployment
 */

import { config } from '@/lib/config'

interface ValidationError {
	variable: string
	error: string
	severity: 'error' | 'warning'
}

interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
	warnings: ValidationError[]
}

function validateEnvironment(): ValidationResult {
	const errors: ValidationError[] = []
	const warnings: ValidationError[] = []

	// Required variables for all environments
	const requiredVars = [
		'NEXT_PUBLIC_SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_ANON_KEY',
		'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
	]

	// Check required variables
	for (const varName of requiredVars) {
		const value = process.env[varName]
		if (!value) {
			errors.push({
				variable: varName,
				error: 'Required environment variable is missing',
				severity: 'error'
			})
		}
	}

	// Production-specific validation
	if (config.app.env === 'production') {
		const productionVars = [
			'NEXT_PUBLIC_API_URL',
			'NEXT_PUBLIC_POSTHOG_KEY',
			'NEXT_PUBLIC_POSTHOG_HOST'
		]

		for (const varName of productionVars) {
			const value = process.env[varName]
			if (!value) {
				errors.push({
					variable: varName,
					error: 'Required for production deployment',
					severity: 'error'
				})
			}
		}

		// Validate URL formats
		if (
			process.env.NEXT_PUBLIC_API_URL &&
			!process.env.NEXT_PUBLIC_API_URL.startsWith('https://')
		) {
			errors.push({
				variable: 'NEXT_PUBLIC_API_URL',
				error: 'Must use HTTPS in production',
				severity: 'error'
			})
		}

		if (
			process.env.NEXT_PUBLIC_SUPABASE_URL &&
			!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')
		) {
			errors.push({
				variable: 'NEXT_PUBLIC_SUPABASE_URL',
				error: 'Must use HTTPS in production',
				severity: 'error'
			})
		}

		// Validate Stripe keys
		if (
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
			!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith(
				'pk_live_'
			)
		) {
			warnings.push({
				variable: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
				error: 'Should use live keys in production (pk_live_)',
				severity: 'warning'
			})
		}

		// Check analytics
		if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			warnings.push({
				variable: 'NEXT_PUBLIC_POSTHOG_KEY',
				error: 'Analytics recommended for production',
				severity: 'warning'
			})
		}
	}

	// All environments require API_URL now
	if (!process.env.NEXT_PUBLIC_API_URL) {
		errors.push({
			variable: 'NEXT_PUBLIC_API_URL',
			error: 'Required for all deployments - no localhost fallbacks in production',
			severity: 'error'
		})
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	}
}

async function validateApiConnectivity() {
	console.log('🔍 Testing API connectivity...')

	try {
		const { apiClient } = await import('@/lib/api-client')
		const result = await apiClient.validateConnectivity()

		if (result.api.status === 'connected') {
			console.log('✅ API connection successful')
			console.log(`📍 Connected to: ${result.config.baseURL}`)
		} else {
			console.log('❌ API connection failed')
			console.log(`📍 Attempted: ${result.config.baseURL}`)
			console.log(`❌ Error: ${result.api.error}`)
		}

		return result.api.status === 'connected'
	} catch (error) {
		console.log('❌ API validation failed:', error)
		return false
	}
}

async function main() {
	console.log('🚀 TenantFlow Environment Validation\n')

	// Validate environment variables
	const envResult = validateEnvironment()

	console.log(`📋 Environment: ${config.app.env}`)
	console.log(`📋 API Base URL: ${config.api.baseURL}`)
	console.log(`📋 App Version: ${config.app.version}\n`)

	// Report errors
	if (envResult.errors.length > 0) {
		console.log('❌ ERRORS:')
		for (const error of envResult.errors) {
			console.log(`   • ${error.variable}: ${error.error}`)
		}
		console.log()
	}

	// Report warnings
	if (envResult.warnings.length > 0) {
		console.log('⚠️  WARNINGS:')
		for (const warning of envResult.warnings) {
			console.log(`   • ${warning.variable}: ${warning.error}`)
		}
		console.log()
	}

	// Test API connectivity (only if no critical errors)
	let apiConnected = false
	if (envResult.valid) {
		apiConnected = await validateApiConnectivity()
	}

	// Final verdict
	console.log('\n📊 VALIDATION SUMMARY:')
	console.log(
		`   Environment Variables: ${envResult.valid ? '✅ Valid' : '❌ Invalid'}`
	)
	console.log(
		`   API Connectivity: ${apiConnected ? '✅ Connected' : '❌ Failed'}`
	)

	const overallValid = envResult.valid && apiConnected
	console.log(
		`   Overall Status: ${overallValid ? '✅ Ready for deployment' : '❌ Not ready for deployment'}`
	)

	// Exit with appropriate code
	process.exit(overallValid ? 0 : 1)
}

if (require.main === module) {
	main().catch(error => {
		console.error('❌ Validation script failed:', error)
		process.exit(1)
	})
}

export { validateEnvironment, validateApiConnectivity }
