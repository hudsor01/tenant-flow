import type { Request } from 'express'
import type { AuthenticatedRequest } from '../shared/types/express-request.types'

const AUTH_HEADER_PREFIX = 'Bearer '

/**
 * Extract JWT token from request Authorization header
 * @param req - Express request (can be Request or AuthenticatedRequest)
 * @returns The token string or null if not present
 */
export function getTokenFromRequest(
	req: Request | AuthenticatedRequest
): string | null {
	const authHeader = req.headers?.authorization as string | undefined
	if (!authHeader || !authHeader.startsWith(AUTH_HEADER_PREFIX)) {
		return null
	}
	return authHeader.substring(AUTH_HEADER_PREFIX.length)
}
