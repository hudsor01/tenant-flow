import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

export interface CsrfTokenData {
  token: string
  sessionId: string
  createdAt: Date
  expiresAt: Date
}

@Injectable()
export class CsrfTokenService {
  private readonly logger = new Logger(CsrfTokenService.name)
  
  // In-memory token store (in production, use Redis or database)
  private readonly tokenStore = new Map<string, CsrfTokenData>()
  private readonly sessionTokens = new Map<string, Set<string>>()
  
  // CSRF configuration
  private readonly TOKEN_LENGTH = 32 // bytes (64 characters when hex-encoded)
  private readonly TOKEN_EXPIRY_MS = 1 * 60 * 60 * 1000 // 1 hour
  private readonly MAX_TOKENS_PER_SESSION = 5
  private readonly CLEANUP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
  
  private readonly csrfSecret: string

  constructor(private readonly configService: ConfigService) {
    this.csrfSecret = this.configService.get<string>('CSRF_SECRET') || this.generateSecret()
    
    if (!this.configService.get<string>('CSRF_SECRET')) {
      this.logger.warn('CSRF_SECRET not set in environment variables. Using generated secret (not suitable for production)')
    }
    
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredTokens()
    }, this.CLEANUP_INTERVAL_MS)
    
    this.logger.log('CSRF Token Service initialized')
  }

  /**
   * Generate a new CSRF token for a session
   */
  generateToken(sessionId: string): CsrfTokenData {
    // Clean up old tokens for this session first
    this.cleanupSessionTokens(sessionId)
    
    // Generate cryptographically secure random token
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH)
    const timestamp = Date.now().toString(36)
    const token = `${timestamp}_${randomBytes.toString('hex')}`
    
    const now = new Date()
    const tokenData: CsrfTokenData = {
      token,
      sessionId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TOKEN_EXPIRY_MS)
    }
    
    // Store token
    this.tokenStore.set(token, tokenData)
    
    // Track tokens by session
    if (!this.sessionTokens.has(sessionId)) {
      this.sessionTokens.set(sessionId, new Set())
    }
    const sessionTokenSet = this.sessionTokens.get(sessionId)
    if (!sessionTokenSet) {
      throw new Error('Session token set not found after creation')
    }
    sessionTokenSet.add(token)
    
    // Enforce max tokens per session
    if (sessionTokenSet.size > this.MAX_TOKENS_PER_SESSION) {
      const oldestTokens = Array.from(sessionTokenSet).slice(0, sessionTokenSet.size - this.MAX_TOKENS_PER_SESSION)
      oldestTokens.forEach(oldToken => {
        this.revokeToken(oldToken)
      })
    }
    
    this.logger.debug('Generated CSRF token', {
      sessionId,
      tokenPrefix: token.substring(0, 16),
      expiresAt: tokenData.expiresAt
    })
    
    return tokenData
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string, sessionId: string): boolean {
    if (!token || !sessionId) {
      this.logger.warn('Invalid token validation attempt: missing token or sessionId')
      return false
    }
    
    const tokenData = this.tokenStore.get(token)
    
    if (!tokenData) {
      this.logger.warn('CSRF token validation failed: token not found', {
        tokenPrefix: token.substring(0, 16),
        sessionId
      })
      return false
    }
    
    // Check if token belongs to the correct session
    if (tokenData.sessionId !== sessionId) {
      this.logger.warn('CSRF token validation failed: session mismatch', {
        tokenPrefix: token.substring(0, 16),
        expectedSession: sessionId,
        actualSession: tokenData.sessionId
      })
      return false
    }
    
    // Check if token has expired
    if (tokenData.expiresAt.getTime() < Date.now()) {
      this.logger.warn('CSRF token validation failed: token expired', {
        tokenPrefix: token.substring(0, 16),
        sessionId,
        expiredAt: tokenData.expiresAt
      })
      this.revokeToken(token)
      return false
    }
    
    this.logger.debug('CSRF token validated successfully', {
      tokenPrefix: token.substring(0, 16),
      sessionId
    })
    
    return true
  }

  /**
   * Generate a token that doesn't require session storage (HMAC-based)
   * Useful for stateless applications
   */
  generateStatelessToken(sessionId: string): string {
    const timestamp = Date.now()
    const expiresAt = timestamp + this.TOKEN_EXPIRY_MS
    const nonce = crypto.randomBytes(16).toString('hex')
    
    // Create payload
    const payload = `${sessionId}:${expiresAt}:${nonce}`
    
    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', this.csrfSecret)
    hmac.update(payload)
    const signature = hmac.digest('hex')
    
    // Combine payload and signature
    const token = `${Buffer.from(payload).toString('base64')}.${signature}`
    
    this.logger.debug('Generated stateless CSRF token', {
      sessionId,
      tokenPrefix: token.substring(0, 16),
      expiresAt: new Date(expiresAt)
    })
    
    return token
  }

  /**
   * Validate a stateless CSRF token
   */
  validateStatelessToken(token: string, sessionId: string): boolean {
    if (!token || !sessionId) {
      this.logger.warn('Invalid stateless token validation: missing token or sessionId')
      return false
    }
    
    try {
      // Split token into payload and signature
      const [encodedPayload, signature] = token.split('.')
      if (!encodedPayload || !signature) {
        this.logger.warn('Invalid stateless token format: missing payload or signature')
        return false
      }
      
      // Decode payload
      const payload = Buffer.from(encodedPayload, 'base64').toString('utf8')
      const [tokenSessionId, expiresAtStr, nonce] = payload.split(':')
      
      if (!tokenSessionId || !expiresAtStr || !nonce) {
        this.logger.warn('Invalid stateless token payload format')
        return false
      }
      
      // Verify session ID
      if (tokenSessionId !== sessionId) {
        this.logger.warn('Stateless token session mismatch', {
          expected: sessionId,
          actual: tokenSessionId
        })
        return false
      }
      
      // Check expiration
      const expiresAt = parseInt(expiresAtStr, 10)
      if (Date.now() > expiresAt) {
        this.logger.warn('Stateless token expired', {
          sessionId,
          expiredAt: new Date(expiresAt)
        })
        return false
      }
      
      // Verify HMAC signature
      const hmac = crypto.createHmac('sha256', this.csrfSecret)
      hmac.update(payload)
      const expectedSignature = hmac.digest('hex')
      
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        this.logger.warn('Stateless token signature verification failed', { sessionId })
        return false
      }
      
      this.logger.debug('Stateless CSRF token validated successfully', {
        sessionId,
        tokenPrefix: token.substring(0, 16)
      })
      
      return true
      
    } catch (error) {
      this.logger.error('Error validating stateless CSRF token', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Revoke a specific token
   */
  revokeToken(token: string): void {
    const tokenData = this.tokenStore.get(token)
    if (tokenData) {
      this.tokenStore.delete(token)
      
      // Remove from session tracking
      const sessionTokens = this.sessionTokens.get(tokenData.sessionId)
      if (sessionTokens) {
        sessionTokens.delete(token)
        if (sessionTokens.size === 0) {
          this.sessionTokens.delete(tokenData.sessionId)
        }
      }
      
      this.logger.debug('CSRF token revoked', {
        tokenPrefix: token.substring(0, 16),
        sessionId: tokenData.sessionId
      })
    }
  }

  /**
   * Revoke all tokens for a session
   */
  revokeSessionTokens(sessionId: string): void {
    const sessionTokens = this.sessionTokens.get(sessionId)
    if (sessionTokens) {
      sessionTokens.forEach(token => {
        this.tokenStore.delete(token)
      })
      this.sessionTokens.delete(sessionId)
      
      this.logger.debug('All CSRF tokens revoked for session', {
        sessionId,
        tokenCount: sessionTokens.size
      })
    }
  }

  /**
   * Get token statistics
   */
  getTokenStats(): {
    totalTokens: number
    activeSessions: number
    oldestToken?: Date
    newestToken?: Date
  } {
    const tokens = Array.from(this.tokenStore.values())
    
    return {
      totalTokens: tokens.length,
      activeSessions: this.sessionTokens.size,
      oldestToken: tokens.length > 0 ? new Date(Math.min(...tokens.map(t => t.createdAt.getTime()))) : undefined,
      newestToken: tokens.length > 0 ? new Date(Math.max(...tokens.map(t => t.createdAt.getTime()))) : undefined
    }
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now()
    let expiredCount = 0
    
    for (const [token, tokenData] of this.tokenStore.entries()) {
      if (tokenData.expiresAt.getTime() < now) {
        this.revokeToken(token)
        expiredCount++
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug('Cleaned up expired CSRF tokens', { expiredCount })
    }
  }

  private cleanupSessionTokens(sessionId: string): void {
    const sessionTokens = this.sessionTokens.get(sessionId)
    if (!sessionTokens) return
    
    const now = Date.now()
    let expiredCount = 0
    
    for (const token of sessionTokens) {
      const tokenData = this.tokenStore.get(token)
      if (!tokenData || tokenData.expiresAt.getTime() < now) {
        this.revokeToken(token)
        expiredCount++
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug('Cleaned up expired session tokens', { sessionId, expiredCount })
    }
  }

  private generateSecret(): string {
    const secret = crypto.randomBytes(32).toString('hex')
    this.logger.warn('Generated random CSRF secret. For production, set CSRF_SECRET environment variable')
    return secret
  }
}