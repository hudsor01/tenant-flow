/**
 * CSRF Token Generation and Validation
 * Provides secure token generation for form submissions
 */

import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'crypto'

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
	return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Set CSRF token in HTTP-only cookie and return token for meta tag
 */
export async function setCSRFToken(): Promise<string> {
	const token = generateCSRFToken()
	const cookieStore = await cookies()

	// Set HTTP-only cookie for server-side validation
	cookieStore.set(CSRF_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 24, // 24 hours
		path: '/'
	})

	return token
}

/**
 * Get CSRF token from cookies for server-side validation
 */
export async function getCSRFToken(): Promise<string | null> {
	const cookieStore = await cookies()
	const token = cookieStore.get(CSRF_COOKIE_NAME)
	return token?.value || null
}

/**
 * Validate CSRF token from form data against cookie
 */
export async function validateCSRFToken(formData: FormData): Promise<boolean> {
	const submittedToken = formData.get('_token') as string
	const cookieToken = await getCSRFToken()

	if (!submittedToken || !cookieToken) {
		return false
	}

	// Use timing-safe comparison to prevent timing attacks
	const submittedHash = createHash('sha256')
		.update(submittedToken)
		.digest('hex')
	const cookieHash = createHash('sha256').update(cookieToken).digest('hex')

	return submittedHash === cookieHash
}

/**
 * Require CSRF token validation (throws error if invalid)
 */
export async function requireCSRFToken(formData: FormData): Promise<void> {
	const isValid = await validateCSRFToken(formData)

	if (!isValid) {
		throw new Error(
			'Invalid CSRF token. Please refresh the page and try again.'
		)
	}
}

/**
 * Client-side utility to get CSRF token from meta tag
 */
export function getClientCSRFToken(): string | null {
	if (typeof document === 'undefined') {
		return null
	}

	const metaTag = document.querySelector('meta[name="csrf-token"]')
	return metaTag?.getAttribute('content') || null
}

/**
 * Add CSRF token to FormData
 */
export function addCSRFTokenToFormData(formData: FormData): void {
	const token = getClientCSRFToken()
	if (token) {
		formData.append('_token', token)
	}
}

/**
 * Create headers with CSRF token
 */
export function createCSRFHeaders(): Record<string, string> {
	const token = getClientCSRFToken()
	return token ? { [CSRF_HEADER_NAME]: token } : {}
}
