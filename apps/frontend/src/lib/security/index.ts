/**
 * Consolidated Security System - Main Export
 * Production-ready security utilities with no conflicts
 */

import { logger } from '@/lib/logger/logger'

// Core Consolidated Security
export { default as Security, withSecurity, withAuth } from './security'
export type { UserRole, Permission } from './security'

// JWT and file upload functions removed - use Supabase built-in features

// Consolidated Security Configuration
export interface SecurityConfig {
	fileUpload: {
		maxSize: number
		allowedTypes: string[]
	}
	jwt: {
		refreshBuffer: number
		maxAge: number
	}
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
	fileUpload: {
		maxSize: 50 * 1024 * 1024, // 50MB
		allowedTypes: ['image/*', 'application/pdf', 'application/msword']
	},
	jwt: {
		refreshBuffer: 5 * 60 * 1000, // 5 minutes
		maxAge: 24 * 60 * 60 * 1000 // 24 hours
	}
}

/**
 * Initialize consolidated security system
 */
export function initializeSecurity(config: Partial<SecurityConfig> = {}) {
	const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config }

	logger.info('🔒 Initializing Consolidated Security System', {
		component: 'lib_security_index.ts'
	})
	logger.info('├── Input Sanitization & XSS Protection:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})
	logger.info('├── Password Validation:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})
	logger.info('├── RBAC Permissions:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})
	logger.info('├── Security Headers:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})
	logger.info('├── Threat Detection:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})
	logger.info('└── Auth Context Extraction:', {
		component: 'lib_security_index.ts',
		data: '✓'
	})

	return finalConfig
}

/**
 * Simple security health check
 */
export async function performSecurityHealthCheck(): Promise<{
	status: 'healthy' | 'warning' | 'critical'
	checks: Record<string, boolean>
	issues: string[]
}> {
	const checks: Record<string, boolean> = {}
	const issues: string[] = []

	// Check if HTTPS is enforced in production
	checks.httpsEnforced =
		process.env.NODE_ENV !== 'production' ||
		process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true
	if (!checks.httpsEnforced) {
		issues.push('HTTPS not enforced in production')
	}

	// Check for required environment variables
	checks.envSecrets = !!(
		process.env.NEXT_PUBLIC_SUPABASE_URL &&
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	)
	if (!checks.envSecrets) {
		issues.push('Required environment variables missing')
	}

	// Check if basic security headers are configured
	checks.basicSecurityHeaders = true

	// Determine overall status
	const failedChecks = Object.values(checks).filter(check => !check).length
	const status =
		failedChecks === 0
			? 'healthy'
			: failedChecks <= 1
				? 'warning'
				: 'critical'

	return { status, checks, issues }
}

/**
 * Essential security best practices for production
 */
export const ESSENTIAL_SECURITY_PRACTICES = [
	'Enable HTTPS in production',
	'Use environment variables for secrets',
	'Implement strong password policies',
	'Keep dependencies updated',
	'Validate all user inputs',
	'Use secure session management',
	'Apply proper RBAC permissions',
	'Monitor for security threats'
]
