import { Injectable } from '@nestjs/common'
import { FastifyRequest } from 'fastify'

/**
 * Session Utilities Service
 * 
 * Focused service for extracting session-related information from HTTP requests.
 * Handles JWT tokens, session cookies, and fallback session identification.
 */
@Injectable()
export class SessionUtilsService {
  
  /**
   * Extract session ID from request (JWT token, session cookie, etc.)
   */
  extractSessionId(request: FastifyRequest): string | null {
    // Try to extract from Authorization header (JWT)
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3 || !tokenParts[1]) return null
        // Extract user ID from JWT payload (without verification - just for session ID)
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        return payload.sub || payload.user_id || payload.id
      } catch {
        // Ignore JWT parsing errors
      }
    }
    
    // Try to extract from session cookie
    const sessionCookie = request.headers.cookie
    if (sessionCookie) {
      const sessionMatch = sessionCookie.match(/session=([^;]+)/)
      if (sessionMatch?.[1]) {
        return sessionMatch[1]
      }
    }
    
    return null
  }

  /**
   * Extract user ID from JWT token without verification
   * This is used for logging and session identification only
   */
  extractUserIdFromJWT(token: string): string | null {
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3 || !tokenParts[1]) return null
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      return payload.sub || payload.user_id || payload.id
    } catch {
      return null
    }
  }

  /**
   * Extract session cookie value
   */
  extractSessionCookie(request: FastifyRequest): string | null {
    const cookies = request.headers.cookie
    if (!cookies) return null
    
    const sessionMatch = cookies.match(/session=([^;]+)/)
    return sessionMatch?.[1] || null
  }

  /**
   * Create a fallback session ID based on IP and User-Agent
   * Used when no proper session tokens are available
   */
  createFallbackSessionId(ip: string, userAgent: string): string {
    const fallbackData = `${ip}:${userAgent || 'unknown'}`
    return Buffer.from(fallbackData).toString('base64').substring(0, 16)
  }
}