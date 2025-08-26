#!/usr/bin/env node

/**
 * Environment Variable Validation Script for TenantFlow
 * 
 * This script validates that all required environment variables are set
 * and meet security requirements. Run this before deployment to ensure
 * proper configuration.
 * 
 * Usage:
 *   node scripts/validate-environment.js [environment]
 * 
 * Environment: development, staging, production (default: development)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const COLORS = {
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	reset: '\x1b[0m',
	bold: '\x1b[1m'
}

const log = {
	info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
	success: (msg) => console.log(`${COLORS.green}✅${COLORS.reset} ${msg}`),
	warning: (msg) => console.log(`${COLORS.yellow}⚠️${COLORS.reset} ${msg}`),
	error: (msg) => console.log(`${COLORS.red}❌${COLORS.reset} ${msg}`),
	title: (msg) => console.log(`${COLORS.bold}${COLORS.cyan}🔒 ${msg}${COLORS.reset}\n`)
}

// Required environment variables by environment
const REQUIRED_VARS = {
	development: {
		NODE_ENV: { required: true, values: ['development'] },
		PORT: { required: false, default: '4600' },
		SUPABASE_URL: { required: true, pattern: /^https:\/\/.+\.supabase\.co$/ },
		SUPABASE_ANON_KEY: { required: true, minLength: 100 },
		SUPABASE_SERVICE_ROLE_KEY: { required: true, minLength: 100 },
		JWT_SECRET: { required: true, minLength: 32 },
		NEXTAUTH_SECRET: { required: false, minLength: 32 },
		NEXTAUTH_URL: { required: false, pattern: /^https?:\/\/.+/ }
	},
	staging: {
		NODE_ENV: { required: true, values: ['staging', 'production'] },
		PORT: { required: false, default: '4600' },
		SUPABASE_URL: { required: true, pattern: /^https:\/\/.+\.supabase\.co$/ },
		SUPABASE_ANON_KEY: { required: true, minLength: 100 },
		SUPABASE_SERVICE_ROLE_KEY: { required: true, minLength: 100 },
		JWT_SECRET: { required: true, minLength: 32 },
		STRIPE_SECRET_KEY: { required: true, pattern: /^sk_(test|live)_/ },
		STRIPE_WEBHOOK_SECRET: { required: true, pattern: /^whsec_/ },
		RESEND_API_KEY: { required: true, pattern: /^re_/ },
		NEXTAUTH_SECRET: { required: true, minLength: 32 },
		NEXTAUTH_URL: { required: true, pattern: /^https:\/\/.+/ }
	},
	production: {
		NODE_ENV: { required: true, values: ['production'] },
		PORT: { required: false, default: '4600' },
		SUPABASE_URL: { required: true, pattern: /^https:\/\/.+\.supabase\.co$/ },
		SUPABASE_ANON_KEY: { required: true, minLength: 100 },
		SUPABASE_SERVICE_ROLE_KEY: { required: true, minLength: 100 },
		JWT_SECRET: { required: true, minLength: 64 }, // Longer for production
		STRIPE_SECRET_KEY: { required: true, pattern: /^sk_live_/ }, // Must be live key
		STRIPE_WEBHOOK_SECRET: { required: true, pattern: /^whsec_/ },
		RESEND_API_KEY: { required: true, pattern: /^re_/ },
		NEXTAUTH_SECRET: { required: true, minLength: 64 },
		NEXTAUTH_URL: { required: true, pattern: /^https:\/\/.+/ },
		// Additional production requirements
		COOKIE_SECRET: { required: true, minLength: 32 },
		DATABASE_URL: { required: false }, // Optional: direct DB connection
		REDIS_URL: { required: false }     // Optional: Redis for caching
	}
}

// Security checks
const SECURITY_CHECKS = {
	// Check if secrets are properly randomized (not default/weak values)
	weakSecrets: [
		'secret',
		'password',
		'123456',
		'your-secret-key',
		'change-me',
		'default',
		'test-secret'
	],
	
	// Check for development keys in production
	developmentPatterns: [
		/^sk_test_/,    // Stripe test keys
		/localhost/,    // Local URLs
		/127\.0\.0\.1/, // Local IPs
		/\.test$/       // Test domains
	]
}

/**
 * Validate a single environment variable
 */
function validateVariable(name, value, config, environment) {
	const issues = []
	
	// Check if required variable is missing
	if (config.required && !value) {
		issues.push(`Missing required variable: ${name}`)
		return issues
	}
	
	// Use default if not set and not required
	if (!value && config.default) {
		process.env[name] = config.default
		log.info(`Using default value for ${name}: ${config.default}`)
		value = config.default
	}
	
	// Skip further checks if variable is not set and not required
	if (!value) return issues
	
	// Length validation
	if (config.minLength && value.length < config.minLength) {
		issues.push(`${name} is too short (minimum ${config.minLength} characters)`)
	}
	
	// Pattern validation
	if (config.pattern && !config.pattern.test(value)) {
		issues.push(`${name} doesn't match required pattern`)
	}
	
	// Value enumeration validation
	if (config.values && !config.values.includes(value)) {
		issues.push(`${name} must be one of: ${config.values.join(', ')}`)
	}
	
	// Security checks
	if (SECURITY_CHECKS.weakSecrets.some(weak => value.toLowerCase().includes(weak))) {
		issues.push(`${name} appears to contain a weak/default secret`)
	}
	
	// Production-specific security checks
	if (environment === 'production') {
		if (SECURITY_CHECKS.developmentPatterns.some(pattern => pattern.test(value))) {
			issues.push(`${name} appears to be a development/test value in production`)
		}
	}
	
	return issues
}

/**
 * Check for environment files and warn about their presence
 */
function checkEnvironmentFiles() {
	const envFiles = ['.env', '.env.local', '.env.development', '.env.production']
	const foundFiles = []
	
	for (const file of envFiles) {
		try {
			readFileSync(resolve(file))
			foundFiles.push(file)
		} catch {
			// File doesn't exist, which is good for production
		}
	}
	
	if (foundFiles.length > 0) {
		log.warning(`Found environment files: ${foundFiles.join(', ')}`)
		log.warning('Ensure these files are not committed to version control')
		log.warning('Use platform-specific environment variable management in production')
	}
	
	return foundFiles
}

/**
 * Generate environment variable template
 */
function generateTemplate(environment) {
	const config = REQUIRED_VARS[environment]
	const template = []
	
	template.push(`# TenantFlow Environment Variables - ${environment.toUpperCase()}`)
	template.push(`# Generated: ${new Date().toISOString()}`)
	template.push('')
	
	for (const [name, settings] of Object.entries(config)) {
		if (settings.required) {
			template.push(`${name}=<required>`)
		} else {
			template.push(`# ${name}=${settings.default || '<optional>'}`)
		}
	}
	
	return template.join('\n')
}

/**
 * Main validation function
 */
function validateEnvironment(targetEnvironment = 'development') {
	log.title('TenantFlow Environment Variable Validation')
	
	// Validate environment parameter
	if (!REQUIRED_VARS[targetEnvironment]) {
		log.error(`Unknown environment: ${targetEnvironment}`)
		log.info(`Available environments: ${Object.keys(REQUIRED_VARS).join(', ')}`)
		process.exit(1)
	}
	
	log.info(`Validating environment: ${targetEnvironment}`)
	log.info(`Current NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
	
	const config = REQUIRED_VARS[targetEnvironment]
	const allIssues = []
	let validCount = 0
	
	// Check environment files
	checkEnvironmentFiles()
	console.log('')
	
	// Validate each required variable
	log.info('Validating environment variables:')
	for (const [name, settings] of Object.entries(config)) {
		const value = process.env[name]
		const issues = validateVariable(name, value, settings, targetEnvironment)
		
		if (issues.length === 0) {
			const displayValue = value ? '✓' : '(default)'
			log.success(`${name}: ${displayValue}`)
			validCount++
		} else {
			for (const issue of issues) {
				log.error(issue)
				allIssues.push(issue)
			}
		}
	}
	
	console.log('')
	
	// Summary
	const totalVars = Object.keys(config).length
	if (allIssues.length === 0) {
		log.success(`All ${totalVars} environment variables are valid! 🎉`)
		
		// Additional production recommendations
		if (targetEnvironment === 'production') {
			console.log('')
			log.info('Production Security Recommendations:')
			log.info('• Rotate secrets regularly (monthly)')
			log.info('• Use different secrets per environment')
			log.info('• Monitor for secret exposure in logs')
			log.info('• Enable secret scanning in CI/CD')
			log.info('• Use platform-native secret management')
		}
		
		return true
	} else {
		log.error(`Found ${allIssues.length} issues with environment configuration`)
		log.info(`${validCount}/${totalVars} variables are valid`)
		
		// Generate template if many variables are missing
		const missingRequired = allIssues.filter(issue => issue.includes('Missing required')).length
		if (missingRequired > 2) {
			console.log('')
			log.info('Environment template:')
			console.log('---')
			console.log(generateTemplate(targetEnvironment))
			console.log('---')
		}
		
		return false
	}
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	const environment = process.argv[2] || 'development'
	const isValid = validateEnvironment(environment)
	process.exit(isValid ? 0 : 1)
}

export { validateEnvironment }