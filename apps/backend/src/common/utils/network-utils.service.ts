import { Injectable } from '@nestjs/common'
import { FastifyRequest } from 'fastify'

/**
 * Network Utilities Service
 * 
 * Focused service for extracting network-related information from HTTP requests.
 * Handles IP address detection, proxy headers, and client identification.
 */
@Injectable()
export class NetworkUtilsService {
  
  /**
   * Get client IP address with proper proxy header handling
   */
  getClientIP(request: FastifyRequest | { headers: Record<string, string | string[]>, ip?: string }): string {
    const forwardedFor = request.headers['x-forwarded-for'] as string
    const realIP = request.headers['x-real-ip'] as string
    const cfConnectingIP = request.headers['cf-connecting-ip'] as string
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || 'unknown'
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    
    if (realIP) {
      return realIP
    }
    
    return request.ip || 'unknown'
  }

  /**
   * Get all possible IP addresses from request headers
   */
  getAllClientIPs(request: FastifyRequest): {
    primary: string
    forwarded: string[]
    realIP: string | null
    cfConnectingIP: string | null
    requestIP: string | undefined
  } {
    const forwardedFor = request.headers['x-forwarded-for'] as string
    const realIP = request.headers['x-real-ip'] as string || null
    const cfConnectingIP = request.headers['cf-connecting-ip'] as string || null
    const requestIP = request.ip

    const forwarded = forwardedFor ? forwardedFor.split(',').map(ip => ip.trim()) : []
    const primary = this.getClientIP(request)

    return {
      primary,
      forwarded,
      realIP,
      cfConnectingIP,
      requestIP
    }
  }

  /**
   * Extract user agent string
   */
  getUserAgent(request: FastifyRequest): string {
    return request.headers['user-agent'] || 'unknown'
  }

  /**
   * Check if request is from a trusted proxy
   */
  isFromTrustedProxy(request: FastifyRequest, trustedProxies: string[] = []): boolean {
    const ip = this.getClientIP(request)
    return trustedProxies.includes(ip)
  }

  /**
   * Get request origin information
   */
  getRequestOrigin(request: FastifyRequest): {
    origin: string | null
    referer: string | null
    host: string | null
  } {
    return {
      origin: request.headers.origin as string || null,
      referer: request.headers.referer as string || null,
      host: request.headers.host as string || null
    }
  }

  /**
   * Check if request appears to be from a bot based on user agent
   */
  isLikelyBot(request: FastifyRequest): boolean {
    const userAgent = this.getUserAgent(request).toLowerCase()
    
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'fetch',
      'googlebot', 'bingbot', 'slurp', 'duckduckbot',
      'baiduspider', 'yandexbot', 'facebookexternalhit',
      'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot'
    ]

    return botPatterns.some(pattern => userAgent.includes(pattern))
  }

  /**
   * Extract connection information
   */
  getConnectionInfo(request: FastifyRequest): {
    ip: string
    userAgent: string
    method: string
    url: string
    timestamp: string
    isBot: boolean
  } {
    return {
      ip: this.getClientIP(request),
      userAgent: this.getUserAgent(request),
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
      isBot: this.isLikelyBot(request)
    }
  }
}