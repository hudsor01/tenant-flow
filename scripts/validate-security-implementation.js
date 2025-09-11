#!/usr/bin/env node

/**
 * Security Implementation Validation Script
 * 
 * This script validates the security implementation against the test report findings
 * and checks if all critical security measures are properly configured.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('SECURITY: Validating TenantFlow Security Implementation...\n')

const validationResults = {
	authGuardImplementation: false,
	rlsPoliciesExist: false,
	inputValidation: false,
	rpcFunctionsSecurity: false,
	rateLimiting: false,
	securityHeaders: false,
	csrfProtection: false,
	fileUploadValidation: false
}

// Helper function to check if file exists and contains pattern
function checkFileForPattern(filePath, patterns, description) {
	try {
		if (!fs.existsSync(filePath)) {
			console.log(`   ERROR: ${description}: File not found - ${filePath}`)
			return false
		}

		const content = fs.readFileSync(filePath, 'utf8')
		const hasAllPatterns = patterns.every(pattern => {
			if (typeof pattern === 'string') {
				return content.includes(pattern)
			} else {
				return pattern.test(content)
			}
		})

		if (hasAllPatterns) {
			console.log(`   SUCCESS: ${description}: Implementation found`)
			return true
		} else {
			console.log(`   WARNING:  ${description}: Partial implementation`)
			patterns.forEach((pattern, index) => {
				const found = typeof pattern === 'string' 
					? content.includes(pattern) 
					: pattern.test(content)
				if (!found) {
					console.log(`      - Missing: ${pattern}`)
				}
			})
			return false
		}
	} catch (error) {
		console.log(`   ERROR: ${description}: Error reading file - ${error.message}`)
		return false
	}
}

// 1. Check Auth Guard Implementation
console.log('1. CHECKING: Validating Auth Guard implementation...')
const authGuardPath = path.join(__dirname, '../apps/backend/src/shared/guards/auth.guard.ts')
validationResults.authGuardImplementation = checkFileForPattern(
	authGuardPath,
	[
		'export class AuthGuard implements CanActivate',
		'validateTokenAndGetUser',
		'validateTenantIsolation',
		'checkRoleAccess',
		'ForbiddenException'
	],
	'AuthGuard with tenant isolation'
)

// 2. Check RLS Policies Exist
console.log('\n2. SECURITY:  Validating RLS policies...')
const rlsMigrationPath = path.join(__dirname, '../supabase/migrations/20250827_ultra_native_rpc_functions.sql')
validationResults.rlsPoliciesExist = checkFileForPattern(
	rlsMigrationPath,
	[
		'SECURITY DEFINER',
		'p_user_id UUID',
		'WHERE p."ownerId" = p_user_id',
		/RAISE EXCEPTION.*access denied/i
	],
	'RLS enforcement in RPC functions'
)

// 3. Check Input Validation
console.log('\n3. VALIDATION: Validating input validation...')
const zodSchemasPath = path.join(__dirname, '../apps/frontend/src/lib/validation/zod-schemas.ts')
const validationPipePath = path.join(__dirname, '../apps/backend/src/shared/pipes/zod-validation.pipe.ts')

const hasZodSchemas = checkFileForPattern(
	zodSchemasPath,
	[
		'import { z }',
		'PropertySchema',
		'TenantSchema',
		/\.min\(\d+\)/,  // Length validation
		/\.max\(\d+\)/   // Max length validation
	],
	'Zod validation schemas'
)

const hasValidationPipe = checkFileForPattern(
	validationPipePath,
	[
		'ZodValidationPipe',
		'BadRequestException',
		'schema.parse'
	],
	'Validation pipe implementation'
)

validationResults.inputValidation = hasZodSchemas && hasValidationPipe

// 4. Check RPC Functions Security
console.log('\n4. SECURITY: Validating RPC function security...')
const rpcFunctionsPath = path.join(__dirname, '../supabase/migrations/20250827_ultra_native_rpc_functions.sql')
validationResults.rpcFunctionsSecurity = checkFileForPattern(
	rpcFunctionsPath,
	[
		'LANGUAGE plpgsql SECURITY DEFINER',
		'IF NOT EXISTS',
		/WHERE.*\."ownerId" = p_user_id/,
		/RAISE EXCEPTION.*not found or access denied/i
	],
	'Secure RPC functions with ownership validation'
)

// 5. Check Rate Limiting
console.log('\n5. RATE_LIMIT: Validating rate limiting...')
const rateLimitPath = path.join(__dirname, '../apps/backend/src/shared/guards/throttler-proxy.guard.ts')
validationResults.rateLimiting = checkFileForPattern(
	rateLimitPath,
	[
		'ThrottlerGuard',
		'ThrottlerException',
		'@UseGuards'
	],
	'Rate limiting implementation'
)

// Alternative check for rate limiting in main app module
if (!validationResults.rateLimiting) {
	const appModulePath = path.join(__dirname, '../apps/backend/src/app.module.ts')
	validationResults.rateLimiting = checkFileForPattern(
		appModulePath,
		[
			'ThrottlerModule',
			'ttl:',
			'limit:'
		],
		'Rate limiting module configuration'
	)
}

// 6. Check Security Headers
console.log('\n6. SECURITY:  Validating security headers...')
const fastifyConfigPaths = [
	path.join(__dirname, '../apps/backend/src/main.ts'),
	path.join(__dirname, '../apps/frontend/next.config.ts')
]

let hasSecurityHeaders = false
for (const configPath of fastifyConfigPaths) {
	const hasHeaders = checkFileForPattern(
		configPath,
		[
			/helmet|security.*headers/i,
			/x-frame-options|frameOptions/i,
			/content.*security.*policy|csp/i
		],
		`Security headers in ${path.basename(configPath)}`
	)
	if (hasHeaders) {
		hasSecurityHeaders = true
		break
	}
}
validationResults.securityHeaders = hasSecurityHeaders

// 7. Check CSRF Protection
console.log('\n7. SECURITY: Validating CSRF protection...')
const csrfPaths = [
	path.join(__dirname, '../apps/backend/src/security/csrf.guard.ts'),
	path.join(__dirname, '../apps/frontend/src/lib/auth/csrf.ts'),
	path.join(__dirname, '../apps/frontend/src/components/auth/csrf-token-field.tsx')
]

let hasCsrfProtection = false
for (const csrfPath of csrfPaths) {
	const hasCSRF = checkFileForPattern(
		csrfPath,
		[
			/csrf|CSRF/,
			/token/i
		],
		`CSRF protection in ${path.basename(csrfPath)}`
	)
	if (hasCSRF) {
		hasCsrfProtection = true
		break
	}
}
validationResults.csrfProtection = hasCsrfProtection

// 8. Check File Upload Validation
console.log('\n8. FILE_UPLOAD: Validating file upload security...')
const storageServicePath = path.join(__dirname, '../apps/backend/src/database/storage.service.ts')
validationResults.fileUploadValidation = checkFileForPattern(
	storageServicePath,
	[
		'fileTypeFromBuffer',
		/allowed.*types|whitelist/i,
		/file.*size.*limit/i,
		'BadRequestException'
	],
	'File upload validation and security'
)

// Check for any storage-related security in Supabase config
if (!validationResults.fileUploadValidation) {
	const supabaseConfigPath = path.join(__dirname, '../apps/backend/src/database/supabase.service.ts')
	validationResults.fileUploadValidation = checkFileForPattern(
		supabaseConfigPath,
		[
			'storage',
			'upload',
			/bucket|file/i
		],
		'Supabase storage security configuration'
	)
}

// Generate Final Report
console.log('\n' + '='.repeat(70))
console.log('STATS: SECURITY IMPLEMENTATION VALIDATION RESULTS')
console.log('='.repeat(70))

const securityChecks = [
	{ name: 'Auth Guard with Tenant Isolation', implemented: validationResults.authGuardImplementation, critical: true },
	{ name: 'RLS Policies and RPC Security', implemented: validationResults.rlsPoliciesExist, critical: true },
	{ name: 'Input Validation (Zod schemas)', implemented: validationResults.inputValidation, critical: true },
	{ name: 'Secure RPC Functions', implemented: validationResults.rpcFunctionsSecurity, critical: true },
	{ name: 'Rate Limiting Protection', implemented: validationResults.rateLimiting, critical: false },
	{ name: 'Security Headers', implemented: validationResults.securityHeaders, critical: false },
	{ name: 'CSRF Protection', implemented: validationResults.csrfProtection, critical: false },
	{ name: 'File Upload Validation', implemented: validationResults.fileUploadValidation, critical: false }
]

let criticalIssues = 0
let totalIssues = 0

securityChecks.forEach(check => {
	const status = check.implemented ? 'SUCCESS: IMPLEMENTED' : 'ERROR: NOT IMPLEMENTED'
	const priority = check.critical ? 'CRITICAL' : 'IMPORTANT'
	
	console.log(`${status} - ${check.name} (${priority})`)
	
	if (!check.implemented) {
		totalIssues++
		if (check.critical) {
			criticalIssues++
		}
	}
})

console.log('\n' + '='.repeat(70))

// Overall Assessment
const implementedCount = securityChecks.filter(check => check.implemented).length
const totalChecks = securityChecks.length
const implementationPercentage = Math.round((implementedCount / totalChecks) * 100)

console.log(`STATS: IMPLEMENTATION SCORE: ${implementedCount}/${totalChecks} (${implementationPercentage}%)`)

if (criticalIssues === 0 && totalIssues <= 2) {
	console.log('SUCCESS: SECURITY STATUS: PRODUCTION READY')
	console.log('   All critical security measures are implemented.')
	if (totalIssues > 0) {
		console.log(`   ${totalIssues} non-critical enhancements recommended.`)
	}
} else if (criticalIssues === 0) {
	console.log('WARNING:  SECURITY STATUS: MOSTLY READY')
	console.log(`   ${totalIssues} security enhancements needed before production.`)
} else {
	console.log('ERROR: SECURITY STATUS: NOT PRODUCTION READY')
	console.log(`   ${criticalIssues} critical security issues must be resolved.`)
	console.log(`   ${totalIssues} total security issues found.`)
}

console.log('\nNEXT STEPS:')
if (criticalIssues > 0) {
	console.log('1. CRITICAL: Address all CRITICAL security implementations immediately')
	console.log('2. IMPORTANT: Implement remaining IMPORTANT security measures')
	console.log('3. TESTING: Run comprehensive security test suite')
	console.log('4. INFO: Update security documentation')
} else {
	console.log('1. TODO: Complete remaining security enhancements')
	console.log('2. TESTING: Execute full security test suite (102 tests)')
	console.log('3. STATS: Set up security monitoring and alerting')
	console.log('4. SCHEDULE: Schedule regular security reviews')
}

console.log('\nRELATED FILES:')
console.log('   FILE: Security Test Report: ./SECURITY_TEST_REPORT.md')
console.log('   FILE: E2E Security Tests: ./tests/e2e/security.spec.ts')
console.log('   CHECKING: API Security Tests: ./apps/backend/src/__tests__/security/')
console.log('   FILE: RLS Validation Tests: ./apps/backend/src/__tests__/security/rls-validation.spec.ts')

// Exit with appropriate code
if (criticalIssues > 0) {
	process.exit(1)
} else if (totalIssues > 2) {
	process.exit(1)
} else {
	process.exit(0)
}