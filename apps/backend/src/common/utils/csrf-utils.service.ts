import { Injectable } from '@nestjs/common'
import { FastifyRequest } from 'fastify'

/**
 * CSRF Utilities Service
 * 
 * Focused service for CSRF token extraction, validation, and route exemption checks.
 * Provides utilities for Cross-Site Request Forgery protection.
 */
@Injectable()
export class CsrfUtilsService {
  
  /**
   * Extract CSRF token from request headers or body
   */
  extractCsrfToken(request: FastifyRequest): string | null {
    // Priority order: X-CSRF-Token > X-XSRF-TOKEN > form field
    
    // Check X-CSRF-Token header (recommended approach)
    const csrfHeader = request.headers['x-csrf-token'] as string
    if (csrfHeader) {
      return csrfHeader
    }
    
    // Check X-XSRF-TOKEN header (Angular/axios convention)
    const xsrfHeader = request.headers['x-xsrf-token'] as string
    if (xsrfHeader) {
      return xsrfHeader
    }
    
    // Check form data for _csrf field (traditional forms)
    const body = request.body as Record<string, unknown>
    if (body && typeof body === 'object' && '_csrf' in body) {
      const formToken = body._csrf
      if (typeof formToken === 'string') {
        return formToken
      }
    }
    
    return null
  }

  /**
   * Validate CSRF token format (basic security validation)
   */
  isValidCsrfTokenFormat(token: string): boolean {
    if (typeof token !== 'string') {
      return false
    }
    
    // Length validation (prevent extremely short or long tokens)
    if (token.length < 16 || token.length > 128) {
      return false
    }
    
    // Character validation (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return false
    }
    
    // Reject obviously fake tokens
    const fakeTokenPatterns = [
      /^test[-_]?token$/i,
      /^fake[-_]?token$/i,
      /^dummy[-_]?token$/i,
      /^csrf[-_]?not[-_]?configured$/i,
      /^1234567890abcdef$/i,
      /^(a|1)+$/,  // Repeated characters
      /^(abc|123)+$/i  // Simple patterns
    ]
    
    if (fakeTokenPatterns.some(pattern => pattern.test(token))) {
      return false
    }
    
    return true
  }

  /**
   * Check if route is globally exempt from CSRF protection
   */
  isGlobalExemptRoute(url: string, exemptRoutes: string[]): boolean {
    // Remove query parameters for route matching
    const path = url.split('?')[0]
    
    return exemptRoutes.some(exemptRoute => {
      // Handle both full paths and relative paths
      return path === exemptRoute || 
             path?.endsWith(exemptRoute) ||
             path?.includes(exemptRoute)
    })
  }

  /**
   * Extract CSRF token from multiple possible sources
   */
  extractTokenFromAllSources(request: FastifyRequest): {
    headerToken: string | null
    xsrfToken: string | null
    formToken: string | null
    selectedToken: string | null
  } {
    const headerToken = request.headers['x-csrf-token'] as string || null
    const xsrfToken = request.headers['x-xsrf-token'] as string || null
    
    const body = request.body as Record<string, unknown>
    const formToken = (body && typeof body === 'object' && '_csrf' in body && typeof body._csrf === 'string') 
      ? body._csrf 
      : null

    const selectedToken = headerToken || xsrfToken || formToken

    return {
      headerToken,
      xsrfToken,
      formToken,
      selectedToken
    }
  }

  /**
   * Check if CSRF token is present in any expected location
   */
  hasCsrfToken(request: FastifyRequest): boolean {
    return this.extractCsrfToken(request) !== null
  }
}