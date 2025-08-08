/**
 * Session management types shared between frontend and backend
 */

/**
 * Session data structure
 */
export interface SessionData {
    userId: string
    sessionId: string
    issuedAt: number
    expiresAt: number
    lastActivity: number
    userAgent?: string
    ipAddress?: string
    refreshTokenId?: string
    organizationId?: string
    deviceFingerprint?: string
    email?: string
}

/**
 * JWT token pair for authentication
 */
export interface TokenPair {
    accessToken: string
    refreshToken: string
    expiresAt: number
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
    isValid: boolean
    session?: SessionData
    reason?: 'expired' | 'invalid' | 'revoked' | 'not_found'
}

/**
 * Session activity update
 */
export interface SessionActivity {
    sessionId: string
    lastActivity: number
    ipAddress?: string
    userAgent?: string
}