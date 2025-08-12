import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SecurityMonitorService } from './security-monitor.service'

export interface RequestLimitsConfig {
  // Request size limits
  maxBodySize: number // bytes
  maxHeaderSize: number // bytes
  maxUrlLength: number // characters
  maxFileUploadSize: number // bytes
  maxMultipartFiles: number // count
  
  // Timeout configurations
  requestTimeout: number // milliseconds
  keepAliveTimeout: number // milliseconds
  headerTimeout: number // milliseconds
  connectionTimeout: number // milliseconds
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean
    windowMs: number
    maxRequestsPerWindow: number
    skipSuccessfulRequests: boolean
    skipFailedRequests: boolean
  }
  
  // Connection limits
  maxConnections: number
  maxConnectionsPerIp: number
  
  // Security thresholds
  alertThresholds: {
    largeRequestSize: number // bytes
    slowRequestTime: number // milliseconds
    highConnectionCount: number
  }
}

export interface RequestMetrics {
  timestamp: Date
  endpoint: string
  method: string
  bodySize: number
  responseTime: number
  statusCode: number
  ip: string
  userAgent?: string
}

@Injectable()
export class RequestLimitsService {
  private readonly logger = new Logger(RequestLimitsService.name)
  private readonly config: RequestLimitsConfig
  
  // Active connection tracking
  private readonly activeConnections = new Map<string, number>()
  private readonly connectionTimestamps = new Map<string, number[]>()
  
  // Request metrics tracking
  private readonly requestMetrics: RequestMetrics[] = []
  private readonly maxMetricsHistory = 10000 // Keep last 10k requests
  
  // Rate limiting tracking
  private readonly rateLimitCounters = new Map<string, number[]>()

  constructor(
    private readonly configService: ConfigService,
    private readonly securityMonitor: SecurityMonitorService
  ) {
    this.config = this.initializeConfig()
    this.startCleanupInterval()
    this.logConfiguration()
  }

  private initializeConfig(): RequestLimitsConfig {
    const env = this.configService.get<string>('NODE_ENV', 'development')
    
    const baseConfig: RequestLimitsConfig = {
      // Request size limits (bytes)
      maxBodySize: this.configService.get<number>('MAX_BODY_SIZE', 10 * 1024 * 1024), // 10MB
      maxHeaderSize: this.configService.get<number>('MAX_HEADER_SIZE', 8 * 1024), // 8KB
      maxUrlLength: this.configService.get<number>('MAX_URL_LENGTH', 2048), // 2KB
      maxFileUploadSize: this.configService.get<number>('MAX_FILE_UPLOAD_SIZE', 50 * 1024 * 1024), // 50MB
      maxMultipartFiles: this.configService.get<number>('MAX_MULTIPART_FILES', 10),
      
      // Timeout configurations (milliseconds)
      requestTimeout: this.configService.get<number>('REQUEST_TIMEOUT', 30000), // 30s
      keepAliveTimeout: this.configService.get<number>('KEEP_ALIVE_TIMEOUT', 5000), // 5s
      headerTimeout: this.configService.get<number>('HEADER_TIMEOUT', 60000), // 60s
      connectionTimeout: this.configService.get<number>('CONNECTION_TIMEOUT', 60000), // 60s
      
      // Rate limiting
      rateLimiting: {
        enabled: this.configService.get<boolean>('RATE_LIMITING_ENABLED', true),
        windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
        maxRequestsPerWindow: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 1000),
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // Connection limits
      maxConnections: this.configService.get<number>('MAX_CONNECTIONS', 1000),
      maxConnectionsPerIp: this.configService.get<number>('MAX_CONNECTIONS_PER_IP', 50),
      
      // Security thresholds
      alertThresholds: {
        largeRequestSize: this.configService.get<number>('ALERT_LARGE_REQUEST_SIZE', 5 * 1024 * 1024), // 5MB
        slowRequestTime: this.configService.get<number>('ALERT_SLOW_REQUEST_TIME', 10000), // 10s
        highConnectionCount: this.configService.get<number>('ALERT_HIGH_CONNECTION_COUNT', 100)
      }
    }

    // Environment-specific adjustments
    if (env === 'development') {
      baseConfig.rateLimiting.maxRequestsPerWindow = 10000 // More lenient for development
      baseConfig.maxConnectionsPerIp = 100
    } else if (env === 'production') {
      baseConfig.rateLimiting.maxRequestsPerWindow = 500 // Stricter for production
      baseConfig.maxConnectionsPerIp = 20
    }

    return baseConfig
  }

  /**
   * Validate request size limits
   */
  validateRequestSize(bodySize: number, headerSize: number, url: string): {
    allowed: boolean
    reason?: string
    alerts?: string[]
  } {
    const alerts: string[] = []

    // Check body size
    if (bodySize > this.config.maxBodySize) {
      return {
        allowed: false,
        reason: `Request body size (${bodySize} bytes) exceeds maximum allowed (${this.config.maxBodySize} bytes)`
      }
    }

    // Check header size
    if (headerSize > this.config.maxHeaderSize) {
      return {
        allowed: false,
        reason: `Request header size (${headerSize} bytes) exceeds maximum allowed (${this.config.maxHeaderSize} bytes)`
      }
    }

    // Check URL length
    if (url.length > this.config.maxUrlLength) {
      return {
        allowed: false,
        reason: `URL length (${url.length} chars) exceeds maximum allowed (${this.config.maxUrlLength} chars)`
      }
    }

    // Check for alerts
    if (bodySize > this.config.alertThresholds.largeRequestSize) {
      alerts.push(`Large request detected: ${bodySize} bytes`)
    }

    return { allowed: true, alerts }
  }

  /**
   * Check rate limits for IP/endpoint combination
   */
  checkRateLimit(ip: string, endpoint?: string): {
    allowed: boolean
    remaining: number
    resetTime: Date
    reason?: string
  } {
    if (!this.config.rateLimiting.enabled) {
      return {
        allowed: true,
        remaining: this.config.rateLimiting.maxRequestsPerWindow,
        resetTime: new Date(Date.now() + this.config.rateLimiting.windowMs)
      }
    }

    const key = endpoint ? `${ip}:${endpoint}` : ip
    const now = Date.now()
    const windowStart = now - this.config.rateLimiting.windowMs
    
    if (!this.rateLimitCounters.has(key)) {
      this.rateLimitCounters.set(key, [])
    }

    const timestamps = this.rateLimitCounters.get(key) || []
    
    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(timestamp => timestamp > windowStart)
    
    // Check if we're over the limit
    if (recentTimestamps.length >= this.config.rateLimiting.maxRequestsPerWindow) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date((recentTimestamps[0] || Date.now()) + this.config.rateLimiting.windowMs),
        reason: `Rate limit exceeded: ${recentTimestamps.length} requests in ${this.config.rateLimiting.windowMs}ms window`
      }
    }

    // Add current timestamp
    recentTimestamps.push(now)
    this.rateLimitCounters.set(key, recentTimestamps)
    
    return {
      allowed: true,
      remaining: this.config.rateLimiting.maxRequestsPerWindow - recentTimestamps.length,
      resetTime: new Date(now + this.config.rateLimiting.windowMs)
    }
  }

  /**
   * Track new connection
   */
  trackConnection(ip: string): {
    allowed: boolean
    reason?: string
    connectionCount: number
  } {
    const currentConnections = this.activeConnections.get(ip) || 0
    
    // Check per-IP connection limit
    if (currentConnections >= this.config.maxConnectionsPerIp) {
      return {
        allowed: false,
        reason: `Too many connections from IP: ${currentConnections}/${this.config.maxConnectionsPerIp}`,
        connectionCount: currentConnections
      }
    }

    // Check global connection limit
    const totalConnections = Array.from(this.activeConnections.values())
      .reduce((total, count) => total + count, 0)
    
    if (totalConnections >= this.config.maxConnections) {
      return {
        allowed: false,
        reason: `Global connection limit reached: ${totalConnections}/${this.config.maxConnections}`,
        connectionCount: currentConnections
      }
    }

    // Track connection
    this.activeConnections.set(ip, currentConnections + 1)
    
    // Track timestamp for cleanup
    if (!this.connectionTimestamps.has(ip)) {
      this.connectionTimestamps.set(ip, [])
    }
    const connectionTimestamps = this.connectionTimestamps.get(ip)
    if (connectionTimestamps) {
      connectionTimestamps.push(Date.now())
    }

    // Check for alerts
    if (currentConnections + 1 > this.config.alertThresholds.highConnectionCount) {
      void this.securityMonitor.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip,
        details: {
          operation: 'high_connection_count',
          connectionCount: currentConnections + 1,
          threshold: this.config.alertThresholds.highConnectionCount
        }
      })
    }

    return {
      allowed: true,
      connectionCount: currentConnections + 1
    }
  }

  /**
   * Release connection
   */
  releaseConnection(ip: string): void {
    const currentConnections = this.activeConnections.get(ip) || 0
    if (currentConnections > 0) {
      this.activeConnections.set(ip, currentConnections - 1)
    }
    
    if (currentConnections <= 1) {
      this.activeConnections.delete(ip)
    }
  }

  /**
   * Record request metrics
   */
  recordRequestMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics)
    
    // Keep only recent metrics
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics.shift()
    }

    // Check for slow request alert
    if (metrics.responseTime > this.config.alertThresholds.slowRequestTime) {
      void this.securityMonitor.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip: metrics.ip,
        endpoint: metrics.endpoint,
        details: {
          operation: 'slow_request',
          responseTime: metrics.responseTime,
          threshold: this.config.alertThresholds.slowRequestTime,
          endpoint: metrics.endpoint,
          method: metrics.method
        }
      })
    }
  }

  /**
   * Get timeout configurations for Fastify
   */
  getTimeoutConfig(): {
    requestTimeout: number
    keepAliveTimeout: number
    connectionTimeout: number
    headerTimeout: number
  } {
    return {
      requestTimeout: this.config.requestTimeout,
      keepAliveTimeout: this.config.keepAliveTimeout,
      connectionTimeout: this.config.connectionTimeout,
      headerTimeout: this.config.headerTimeout
    }
  }

  /**
   * Get request limits for validation
   */
  getRequestLimits(): {
    maxBodySize: number
    maxHeaderSize: number
    maxUrlLength: number
    maxFileUploadSize: number
    maxMultipartFiles: number
  } {
    return {
      maxBodySize: this.config.maxBodySize,
      maxHeaderSize: this.config.maxHeaderSize,
      maxUrlLength: this.config.maxUrlLength,
      maxFileUploadSize: this.config.maxFileUploadSize,
      maxMultipartFiles: this.config.maxMultipartFiles
    }
  }

  /**
   * Get current metrics and statistics
   */
  getMetrics(): {
    activeConnections: number
    connectionsByIp: Record<string, number>
    rateLimitedIps: number
    recentRequests: number
    averageResponseTime: number
    slowRequests: number
    largeRequests: number
  } {
    const totalConnections = Array.from(this.activeConnections.values())
      .reduce((total, count) => total + count, 0)
    
    const recentRequests = this.requestMetrics.filter(
      m => Date.now() - m.timestamp.getTime() < 60000 // Last minute
    )
    
    const averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, m) => sum + m.responseTime, 0) / recentRequests.length
      : 0
    
    const slowRequests = this.requestMetrics.filter(
      m => m.responseTime > this.config.alertThresholds.slowRequestTime
    ).length
    
    const largeRequests = this.requestMetrics.filter(
      m => m.bodySize > this.config.alertThresholds.largeRequestSize
    ).length

    return {
      activeConnections: totalConnections,
      connectionsByIp: Object.fromEntries(this.activeConnections),
      rateLimitedIps: this.rateLimitCounters.size,
      recentRequests: recentRequests.length,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      largeRequests
    }
  }

  private startCleanupInterval(): void {
    // Clean up old data every 5 minutes
    setInterval(() => {
      this.cleanupOldData()
    }, 5 * 60 * 1000)
  }

  private cleanupOldData(): void {
    const now = Date.now()
    const cutoff = now - (this.config.rateLimiting.windowMs * 2)
    
    // Clean up rate limit counters
    for (const [key, timestamps] of this.rateLimitCounters.entries()) {
      const recentTimestamps = timestamps.filter(timestamp => timestamp > cutoff)
      
      if (recentTimestamps.length === 0) {
        this.rateLimitCounters.delete(key)
      } else {
        this.rateLimitCounters.set(key, recentTimestamps)
      }
    }
    
    // Clean up connection timestamps
    for (const [ip, timestamps] of this.connectionTimestamps.entries()) {
      const recentTimestamps = timestamps.filter(timestamp => timestamp > cutoff)
      
      if (recentTimestamps.length === 0) {
        this.connectionTimestamps.delete(ip)
      } else {
        this.connectionTimestamps.set(ip, recentTimestamps)
      }
    }
    
    // Clean up old request metrics (keep last hour)
    const metricscutoff = now - (60 * 60 * 1000)
    while (this.requestMetrics.length > 0) {
      const firstMetric = this.requestMetrics[0]
      if (firstMetric && firstMetric.timestamp.getTime() < metricscutoff) {
        this.requestMetrics.shift()
      } else {
        break
      }
    }
    
    this.logger.debug('Request limits cleanup completed', {
      rateLimitEntries: this.rateLimitCounters.size,
      connectionEntries: this.connectionTimestamps.size,
      metricsEntries: this.requestMetrics.length
    })
  }

  private logConfiguration(): void {
    this.logger.log('Request limits configuration loaded', {
      maxBodySize: `${Math.round(this.config.maxBodySize / 1024 / 1024)}MB`,
      maxFileUploadSize: `${Math.round(this.config.maxFileUploadSize / 1024 / 1024)}MB`,
      requestTimeout: `${this.config.requestTimeout}ms`,
      maxConnections: this.config.maxConnections,
      maxConnectionsPerIp: this.config.maxConnectionsPerIp,
      rateLimitingEnabled: this.config.rateLimiting.enabled,
      rateLimitWindow: `${this.config.rateLimiting.windowMs / 1000}s`,
      rateLimitMaxRequests: this.config.rateLimiting.maxRequestsPerWindow
    })
  }
}