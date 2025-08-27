import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

const CSRF_TOKEN_NAME = 'csrf-token'
const TOKEN_LENGTH = 32
const TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCSRFToken(): string {
	return randomBytes(TOKEN_LENGTH).toString('hex')
}

// CSRF response type for type safety
interface CSRFResponse {
	token: string
}

/**
 * GET /api/auth/csrf
 * Get or create CSRF token
 */
export async function GET(): Promise<NextResponse<CSRFResponse>> {
	const cookieStore = await cookies()

	// Check if token already exists
	let token = cookieStore.get(CSRF_TOKEN_NAME)?.value

	if (!token) {
		// Generate new token
		token = generateCSRFToken()

		// Set httpOnly cookie
		cookieStore.set(CSRF_TOKEN_NAME, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: TOKEN_MAX_AGE,
			path: '/'
		})
	}

	// Return token to client (for form inclusion)
	return NextResponse.json({ token })
}
