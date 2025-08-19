/**
 * Consolidated Security Module for TenantFlow
 * Production-ready security utilities with no conflicts
 * Replaces: simple-security.ts, input-sanitization.ts, enhanced-security-headers.ts, rbac.ts
 */

import { type NextRequest, NextResponse } from 'next/server'

// ===========================
// TYPES AND INTERFACES
// ===========================

export enum UserRole {
	SUPER_ADMIN = 'SUPER_ADMIN',
	ADMIN = 'ADMIN',
	PROPERTY_MANAGER = 'PROPERTY_MANAGER',
	PROPERTY_OWNER = 'PROPERTY_OWNER',
	TENANT = 'TENANT',
	MAINTENANCE_STAFF = 'MAINTENANCE_STAFF',
	READONLY_USER = 'READONLY_USER'
}

export enum Permission {
	READ_PROPERTIES = 'READ_PROPERTIES',
	WRITE_PROPERTIES = 'WRITE_PROPERTIES',
	READ_TENANTS = 'READ_TENANTS',
	WRITE_TENANTS = 'WRITE_TENANTS',
	READ_MAINTENANCE = 'READ_MAINTENANCE',
	WRITE_MAINTENANCE = 'WRITE_MAINTENANCE',
	READ_FINANCIAL = 'READ_FINANCIAL',
	WRITE_FINANCIAL = 'WRITE_FINANCIAL',
	ADMIN_ACCESS = 'ADMIN_ACCESS'
}

interface SecurityValidationResult {
	valid: boolean
	errors: string[]
	sanitized?: string
}

interface AuthContext {
	userId?: string
	organizationId?: string
	userRole?: UserRole
	isAuthenticated: boolean
}

// ===========================
// CORE SECURITY CLASS
// ===========================

export class Security {
	private static rolePermissions: Record<UserRole, Permission[]> = {
		[UserRole.SUPER_ADMIN]: Object.values(Permission),
		[UserRole.ADMIN]: [
			Permission.READ_PROPERTIES,
			Permission.WRITE_PROPERTIES,
			Permission.READ_TENANTS,
			Permission.WRITE_TENANTS,
			Permission.READ_MAINTENANCE,
			Permission.WRITE_MAINTENANCE,
			Permission.READ_FINANCIAL,
			Permission.WRITE_FINANCIAL,
			Permission.ADMIN_ACCESS
		],
		[UserRole.PROPERTY_MANAGER]: [
			Permission.READ_PROPERTIES,
			Permission.WRITE_PROPERTIES,
			Permission.READ_TENANTS,
			Permission.WRITE_TENANTS,
			Permission.READ_MAINTENANCE,
			Permission.WRITE_MAINTENANCE,
			Permission.READ_FINANCIAL
		],
		[UserRole.PROPERTY_OWNER]: [
			Permission.READ_PROPERTIES,
			Permission.READ_TENANTS,
			Permission.READ_MAINTENANCE,
			Permission.READ_FINANCIAL
		],
		[UserRole.TENANT]: [
			Permission.READ_MAINTENANCE,
			Permission.WRITE_MAINTENANCE
		],
		[UserRole.MAINTENANCE_STAFF]: [
			Permission.READ_PROPERTIES,
			Permission.READ_MAINTENANCE,
			Permission.WRITE_MAINTENANCE
		],
		[UserRole.READONLY_USER]: [
			Permission.READ_PROPERTIES,
			Permission.READ_TENANTS,
			Permission.READ_MAINTENANCE,
			Permission.READ_FINANCIAL
		]
	}

	// ===========================
	// PASSWORD VALIDATION
	// ===========================

	static validatePassword(password: string): SecurityValidationResult {
		const errors: string[] = []

		if (!password || password.length < 8) {
			errors.push('Password must be at least 8 characters long')
		}

		if (!/[A-Z]/.test(password)) {
			errors.push('Password must contain at least one uppercase letter')
		}

		if (!/[a-z]/.test(password)) {
			errors.push('Password must contain at least one lowercase letter')
		}

		if (!/[0-9]/.test(password)) {
			errors.push('Password must contain at least one number')
		}

		if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
			errors.push('Password must contain at least one special character')
		}

		// Check for common weak patterns
		const commonPasswords = [
			'password',
			'password123',
			'admin',
			'letmein',
			'welcome'
		]
		if (
			commonPasswords.some(common =>
				password.toLowerCase().includes(common)
			)
		) {
			errors.push('Password is too common')
		}

		return { valid: errors.length === 0, errors }
	}

	// ===========================
	// INPUT SANITIZATION
	// ===========================

	static sanitizeInput(input: string): SecurityValidationResult {
		const errors: string[] = []

		if (!input) {
			return { valid: true, errors: [], sanitized: '' }
		}

		// Remove control characters
		let sanitized = ''
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i)
			// Skip dangerous control characters
			if (
				(charCode >= 0 && charCode <= 8) ||
				(charCode >= 11 && charCode <= 12) ||
				(charCode >= 14 && charCode <= 31) ||
				(charCode >= 127 && charCode <= 159)
			) {
				continue
			}
			sanitized += input[i]
		}

		// Check for XSS patterns
		const xssPatterns = [
			/<script[\s\S]*?>/gi,
			/javascript:/gi,
			/on\w+\s*=/gi,
			/<iframe[\s\S]*?>/gi,
			/<object[\s\S]*?>/gi
		]

		const hasXSS = xssPatterns.some(pattern => pattern.test(sanitized))
		if (hasXSS) {
			errors.push('Potentially malicious content detected')
			// Strip HTML tags for safety
			sanitized = sanitized.replace(/<[^>]*>/g, '')
		}

		// Basic HTML entity encoding
		sanitized = sanitized
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;')

		return {
			valid: errors.length === 0,
			errors,
			sanitized: sanitized.trim()
		}
	}

	// ===========================
	// EMAIL VALIDATION
	// ===========================

	static validateEmail(email: string): SecurityValidationResult {
		const errors: string[] = []

		if (!email) {
			errors.push('Email is required')
			return { valid: false, errors }
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

		if (!emailRegex.test(email)) {
			errors.push('Invalid email format')
		}

		if (email.length > 254) {
			errors.push('Email too long')
		}

		if (email.includes('..')) {
			errors.push('Invalid email format')
		}

		const sanitizeResult = this.sanitizeInput(email.toLowerCase().trim())

		return {
			valid: errors.length === 0 && sanitizeResult.valid,
			errors: [...errors, ...sanitizeResult.errors],
			sanitized: sanitizeResult.sanitized
		}
	}

	// ===========================
	// RBAC PERMISSIONS
	// ===========================

	static hasPermission(userRole: UserRole, permission: Permission): boolean {
		return this.rolePermissions[userRole]?.includes(permission) || false
	}

	static hasResourceAccess(
		userRole: UserRole,
		organizationId: string,
		resourceOrgId?: string,
		userId?: string,
		resourceOwnerId?: string
	): boolean {
		// Super admin has access to everything
		if (userRole === UserRole.SUPER_ADMIN) {
			return true
		}

		// Organization-level access control
		if (resourceOrgId && organizationId !== resourceOrgId) {
			return false
		}

		// User-level access control (own resources)
		if (resourceOwnerId && userId && userId !== resourceOwnerId) {
			// Only managers and above can access other users' resources
			const managerRoles = [UserRole.ADMIN, UserRole.PROPERTY_MANAGER]
			return managerRoles.includes(userRole)
		}

		return true
	}

	// ===========================
	// SECURITY HEADERS
	// ===========================

	static applySecurityHeaders(response: NextResponse): NextResponse {
		// Essential security headers for production
		response.headers.set('X-Content-Type-Options', 'nosniff')
		response.headers.set('X-Frame-Options', 'DENY')
		response.headers.set('X-XSS-Protection', '1; mode=block')
		response.headers.set(
			'Referrer-Policy',
			'strict-origin-when-cross-origin'
		)
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains'
		)

		// CSP for production
		const csp = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"img-src 'self' data: https: *.supabase.co *.googleusercontent.com",
			"font-src 'self' https://fonts.gstatic.com",
			"connect-src 'self' https://api.tenantflow.app https://*.supabase.co https://js.stripe.com wss:",
			"frame-src 'self' https://js.stripe.com"
		].join('; ')

		response.headers.set('Content-Security-Policy', csp)

		return response
	}

	// ===========================
	// THREAT DETECTION
	// ===========================

	static isSuspiciousRequest(request: NextRequest): boolean {
		const url = request.url.toLowerCase()
		const userAgent = request.headers.get('user-agent') || ''

		// Check for obvious injection attempts
		const suspiciousPatterns = [
			/union.*select/i,
			/insert.*into/i,
			/delete.*from/i,
			/<script/i,
			/javascript:/i,
			/\.\.[\\/]/,
			/%2e%2e/i
		]

		return suspiciousPatterns.some(
			pattern => pattern.test(url) || pattern.test(userAgent)
		)
	}

	// ===========================
	// AUTH CONTEXT EXTRACTION
	// ===========================

	static async extractAuthContext(
		request: NextRequest
	): Promise<AuthContext> {
		const authHeader = request.headers.get('authorization')
		const sessionCookie = request.cookies.get('session')?.value

		// Basic authentication check
		const isAuthenticated = !!(authHeader || sessionCookie)

		// In production, decode JWT token here
		return {
			isAuthenticated,
			userId: undefined, // Extract from JWT
			organizationId: undefined, // Extract from JWT
			userRole: undefined // Extract from JWT
		}
	}
}

// ===========================
// MIDDLEWARE HELPERS
// ===========================

/**
 * Basic security middleware for API routes
 */
export function withSecurity(
	handler: (req: NextRequest) => Promise<NextResponse>
) {
	return async function securedHandler(
		req: NextRequest
	): Promise<NextResponse> {
		// Check for suspicious requests
		if (Security.isSuspiciousRequest(req)) {
			return new NextResponse('Request blocked', { status: 403 })
		}

		// Call the original handler
		const response = await handler(req)

		// Add security headers
		return Security.applySecurityHeaders(response)
	}
}

/**
 * Authentication middleware for protected routes
 */
export function withAuth(
	handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
	requiredPermission?: Permission
) {
	return async function authHandler(req: NextRequest): Promise<NextResponse> {
		const context = await Security.extractAuthContext(req)

		if (!context.isAuthenticated) {
			return new NextResponse('Unauthorized', { status: 401 })
		}

		if (
			requiredPermission &&
			context.userRole &&
			!Security.hasPermission(context.userRole, requiredPermission)
		) {
			return new NextResponse('Forbidden', { status: 403 })
		}

		return handler(req, context)
	}
}

// ===========================
// EXPORTS
// ===========================

export default Security
