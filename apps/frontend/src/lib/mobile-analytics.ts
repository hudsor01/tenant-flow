/**
 * Mobile Analytics Utility
 * Lightweight analytics for mobile-specific events
 */

interface MobileAnalyticsEvent {
  eventName: string
  properties: Record<string, unknown>
  timestamp: string
  userAgent: string
  screenResolution: string
  networkType: string
  isOnline: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType: string
  }
}

class MobileAnalytics {
  private endpoint = '/api/v1/analytics'
  private isTracking = true

  track(eventName: string, properties: Record<string, unknown> = {}) {
    if (!this.isTracking) return

    const analyticsEvent: MobileAnalyticsEvent = {
      eventName,
      properties,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      networkType: (navigator as NavigatorWithConnection).connection?.effectiveType || 'unknown',
      isOnline: navigator.onLine
    }

    // Sanitize properties to remove sensitive data
    const sanitizedProperties = this.sanitizeProperties(analyticsEvent.properties)

    // Send to analytics endpoint
    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'mobile-analytics-endpoint'
      },
      body: JSON.stringify({
        ...analyticsEvent,
        properties: sanitizedProperties
      })
    }).catch(() => {
      // Fail silently to avoid impacting user experience
    })
  }

  private sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'cookie', 'session']

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 100) + '...'
      } else if (sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey)
      )) {
        // Skip sensitive properties
        sanitized[key] = 'REDACTED'
        sanitized.unsupported = true
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  enable() {
    this.isTracking = true
  }

  disable() {
    this.isTracking = false
  }
}

export const mobileAnalytics = new MobileAnalytics()
