import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

/**
 * CSRF Token Service
 * 
 * Implements secure CSRF protection using the double-submit cookie pattern.
 * This approach doesn't require server-side session storage while maintaining security.
 * 
 * Security Features:
 * - HMAC-signed tokens with secret key
 * - Token expiration (default 24 hours)
 * - Secure random token generation
 * - Constant-time comparison to prevent timing attacks
 */
@Injectable()
export class CsrfService {
  private readonly logger = new Logger(CsrfService.name)
  private readonly csrfSecret: string
  private readonly tokenExpiry: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

  constructor(private readonly configService: ConfigService) {
    this.csrfSecret = this.configService.get<string>('CSRF_SECRET') || 
                      this.configService.get<string>('JWT_SECRET') ||
                      'fallback-csrf-secret-change-in-production'
    
    if (this.csrfSecret === 'fallback-csrf-secret-change-in-production') {
      this.logger.warn('🚨 Using fallback CSRF secret - configure CSRF_SECRET environment variable')
    }
  }

  /**
   * Generate a new CSRF token
   * Format: {timestamp}.{nonce}.{hmac}
   */
  generateToken(): string {
    const timestamp = Date.now().toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    const payload = `${timestamp}.${nonce}`
    const hmac = crypto
      .createHmac('sha256', this.csrfSecret)
      .update(payload)
      .digest('hex')

    return `${payload}.${hmac}`
  }

  /**
   * Validate CSRF token
   * Verifies HMAC signature and token expiration
   */
  validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return false
      }

      const [timestampStr, nonceStr, receivedHmac] = parts
      
      if (!timestampStr || !nonceStr || !receivedHmac) {
        return false
      }
      
      // Check token expiration
      const tokenTime = parseInt(timestampStr, 10)
      if (isNaN(tokenTime)) {
        return false
      }
      
      const now = Date.now()
      if (now - tokenTime > this.tokenExpiry) {
        this.logger.debug('CSRF token expired')
        return false
      }

      // Verify HMAC signature
      const payload = `${timestampStr}.${nonceStr}`
      const expectedHmac = crypto
        .createHmac('sha256', this.csrfSecret)
        .update(payload)
        .digest('hex')

      // Use constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(expectedHmac, receivedHmac)
    } catch (error) {
      this.logger.debug('CSRF token validation error:', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Create secure cookie options for CSRF token
   */
  getCookieOptions(isProduction = false) {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: this.tokenExpiry,
      path: '/',
    }
  }
}