import { logger } from '@/lib/logger'
import { trackServerSideEvent } from '@/lib/analytics/posthog-server'

interface RateLimitEvent {
  type: 'login' | 'signup' | 'password-reset'
  identifier: string
  attempts: number
  locked: boolean
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Monitor and report rate limit events for security analysis
 */
export class RateLimitMonitor {
  private static instance: RateLimitMonitor
  private events: RateLimitEvent[] = []
  private readonly MAX_EVENTS = 1000
  private reportInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start periodic reporting
    this.startPeriodicReporting()
  }

  static getInstance(): RateLimitMonitor {
    if (!RateLimitMonitor.instance) {
      RateLimitMonitor.instance = new RateLimitMonitor()
    }
    return RateLimitMonitor.instance
  }

  /**
   * Log a rate limit event
   */
  async logEvent(event: RateLimitEvent): Promise<void> {
    // Add to local buffer
    this.events.push({
      ...event,
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
      }
    })

    // Trim buffer if too large
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS)
    }

    // Log based on severity
    if (event.locked) {
      logger.warn('Rate limit lockout triggered', {
        component: 'RateLimitMonitor',
        type: event.type,
        identifier: this.hashIdentifier(event.identifier),
        attempts: event.attempts,
        reason: event.reason
      })

      // Track in PostHog for analytics
      await this.trackSecurityEvent(event)
    } else if (event.attempts >= 3) {
      logger.info('Rate limit warning', {
        component: 'RateLimitMonitor',
        type: event.type,
        identifier: this.hashIdentifier(event.identifier),
        attempts: event.attempts
      })
    }

    // Check for suspicious patterns
    this.detectSuspiciousActivity()
  }

  /**
   * Track security event in analytics
   */
  private async trackSecurityEvent(event: RateLimitEvent): Promise<void> {
    try {
      await trackServerSideEvent('security_rate_limit_triggered', undefined, {
        event_type: event.type,
        locked: event.locked,
        attempts: event.attempts,
        identifier_hash: this.hashIdentifier(event.identifier),
        reason: event.reason,
        ...event.metadata
      })
    } catch (error) {
      logger.error('Failed to track security event', error instanceof Error ? error : new Error(String(error)), {
        component: 'RateLimitMonitor'
      })
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private detectSuspiciousActivity(): void {
    const recentWindow = Date.now() - 5 * 60 * 1000 // 5 minutes
    const recentEvents = this.events.filter(e => {
      const timestamp = e.metadata?.timestamp as string
      return timestamp && new Date(timestamp).getTime() > recentWindow
    })

    // Check for distributed attacks (multiple IPs)
    const uniqueIdentifiers = new Set(recentEvents.map(e => e.identifier))
    if (uniqueIdentifiers.size > 10 && recentEvents.length > 50) {
      logger.error('Potential distributed attack detected', new Error('Multiple IPs attempting authentication'), {
        component: 'RateLimitMonitor',
        uniqueIdentifiers: uniqueIdentifiers.size,
        totalAttempts: recentEvents.length
      })

      // Alert via PostHog
      trackServerSideEvent('security_alert_distributed_attack', undefined, {
        unique_sources: uniqueIdentifiers.size,
        total_attempts: recentEvents.length,
        time_window: '5_minutes'
      }).catch(() => {
        // Ignore tracking errors
      })
    }

    // Check for credential stuffing (same email, multiple IPs)
    const emailAttempts = new Map<string, Set<string>>()
    recentEvents.forEach(event => {
      const [ip, email] = event.identifier.split(':')
      if (email) {
        if (!emailAttempts.has(email)) {
          emailAttempts.set(email, new Set())
        }
        emailAttempts.get(email)?.add(ip)
      }
    })

    emailAttempts.forEach((ips, email) => {
      if (ips.size > 3) {
        logger.error('Potential credential stuffing detected', new Error('Multiple IPs for same email'), {
          component: 'RateLimitMonitor',
          emailHash: this.hashIdentifier(email),
          uniqueIPs: ips.size
        })

        // Alert via PostHog
        trackServerSideEvent('security_alert_credential_stuffing', undefined, {
          email_hash: this.hashIdentifier(email),
          unique_ips: ips.size,
          time_window: '5_minutes'
        }).catch(() => {
          // Ignore tracking errors
        })
      }
    })
  }

  /**
   * Hash identifier for privacy
   */
  private hashIdentifier(identifier: string): string {
    // Simple hash for privacy (not cryptographic)
    let hash = 0
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    // Report statistics every hour
    this.reportInterval = setInterval(() => {
      this.reportStatistics()
    }, 60 * 60 * 1000) // 1 hour
  }

  /**
   * Report aggregated statistics
   */
  private reportStatistics(): void {
    if (this.events.length === 0) return

    const stats = {
      total: this.events.length,
      locked: this.events.filter(e => e.locked).length,
      byType: {
        login: this.events.filter(e => e.type === 'login').length,
        signup: this.events.filter(e => e.type === 'signup').length,
        passwordReset: this.events.filter(e => e.type === 'password-reset').length,
      }
    }

    logger.info('Rate limit statistics', {
      component: 'RateLimitMonitor',
      ...stats
    })

    // Track aggregated stats
    trackServerSideEvent('security_rate_limit_stats', undefined, stats).catch(() => {
      // Ignore tracking errors
    })

    // Clear old events (keep last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    this.events = this.events.filter(e => {
      const timestamp = e.metadata?.timestamp as string
      return timestamp && new Date(timestamp).getTime() > oneHourAgo
    })
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    total: number
    locked: number
    byType: Record<string, number>
    recentEvents: RateLimitEvent[]
  } {
    const last5Minutes = Date.now() - 5 * 60 * 1000
    const recentEvents = this.events.filter(e => {
      const timestamp = e.metadata?.timestamp as string
      return timestamp && new Date(timestamp).getTime() > last5Minutes
    })

    return {
      total: this.events.length,
      locked: this.events.filter(e => e.locked).length,
      byType: {
        login: this.events.filter(e => e.type === 'login').length,
        signup: this.events.filter(e => e.type === 'signup').length,
        passwordReset: this.events.filter(e => e.type === 'password-reset').length,
      },
      recentEvents
    }
  }

  /**
   * Clean up
   */
  cleanup(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval)
      this.reportInterval = null
    }
    this.events = []
  }
}

// Export singleton instance
export const rateLimitMonitor = RateLimitMonitor.getInstance()