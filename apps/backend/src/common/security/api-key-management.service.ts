import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { SecurityMonitorService } from './security-monitor.service'
import { EncryptionService } from './encryption.service'

export interface ApiKeyConfig {
  keyId: string
  serviceName: string
  description?: string
  permissions: string[]
  expiresAt?: Date
  createdAt: Date
  lastUsedAt?: Date
  usageCount: number
  isActive: boolean
  rateLimits: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  ipWhitelist?: string[]
  environment: 'development' | 'staging' | 'production'
}

export interface ExternalServiceConfig {
  serviceName: string
  baseUrl: string
  apiKey: string
  encryptedKey?: string
  timeout: number
  retryAttempts: number
  healthCheckEndpoint?: string
  rateLimits: {
    requestsPerSecond: number
    burstLimit: number
  }
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    recoveryTimeout: number
  }
  lastHealthCheck?: Date
  isHealthy: boolean
}

export interface ApiKeyUsageStats {
  keyId: string
  serviceName: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastUsed: Date
  rateLimitHits: number
  securityViolations: number
}

/**
 * API Key Management Service
 * 
 * Provides secure management of API keys for external services including:
 * - Encrypted storage of API keys
 * - Key rotation and expiration
 * - Usage tracking and rate limiting
 * - Circuit breaker pattern for external services
 * - Security monitoring and anomaly detection
 */
@Injectable()
export class ApiKeyManagementService {
  private readonly logger = new Logger(ApiKeyManagementService.name)
  private readonly apiKeys = new Map<string, ApiKeyConfig>()
  private readonly externalServices = new Map<string, ExternalServiceConfig>()
  private readonly usageStats = new Map<string, ApiKeyUsageStats>()
  private readonly rateLimitTracking = new Map<string, { count: number; resetTime: number }>()

  // Circuit breaker states for external services
  private readonly circuitBreakerStates = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    failureCount: number
    nextAttemptTime: number
  }>()

  constructor(
    private readonly configService: ConfigService,
    private readonly securityMonitor: SecurityMonitorService,
    private readonly encryptionService: EncryptionService
  ) {
    this.logger.log('API Key Management Service initialized')
    // TODO: Temporarily disabled to fix startup crash
    // this.initializeExternalServices()
    // this.startMaintenanceTasks()
  }

  /**
   * Generate a new API key for internal use
   */
  async generateApiKey(config: {
    serviceName: string
    description?: string
    permissions: string[]
    expiresIn?: number // days
    rateLimits?: {
      requestsPerMinute?: number
      requestsPerHour?: number
      requestsPerDay?: number
    }
    ipWhitelist?: string[]
  }): Promise<{ keyId: string; apiKey: string }> {
    const keyId = this.generateKeyId()
    const apiKey = this.generateSecureApiKey()
    
    const expiresAt = config.expiresIn 
      ? new Date(Date.now() + config.expiresIn * 24 * 60 * 60 * 1000)
      : undefined

    const keyConfig: ApiKeyConfig = {
      keyId,
      serviceName: config.serviceName,
      description: config.description,
      permissions: config.permissions,
      expiresAt,
      createdAt: new Date(),
      usageCount: 0,
      isActive: true,
      rateLimits: {
        requestsPerMinute: config.rateLimits?.requestsPerMinute || 60,
        requestsPerHour: config.rateLimits?.requestsPerHour || 1000,
        requestsPerDay: config.rateLimits?.requestsPerDay || 10000
      },
      ipWhitelist: config.ipWhitelist,
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
    }

    this.apiKeys.set(keyId, keyConfig)
    
    // Initialize usage stats
    this.usageStats.set(keyId, {
      keyId,
      serviceName: config.serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: new Date(),
      rateLimitHits: 0,
      securityViolations: 0
    })

    await this.securityMonitor.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      details: {
        operation: 'api_key_generated',
        keyId,
        serviceName: config.serviceName,
        permissions: config.permissions
      }
    })

    this.logger.log('API key generated', {
      keyId,
      serviceName: config.serviceName,
      permissions: config.permissions.length
    })

    return { keyId, apiKey }
  }

  /**
   * Validate API key and check permissions
   */
  async validateApiKey(
    apiKey: string, 
    requiredPermission: string,
    clientIp?: string
  ): Promise<{ valid: boolean; keyConfig?: ApiKeyConfig; reason?: string }> {
    const keyId = this.extractKeyId(apiKey)
    if (!keyId) {
      await this.logSecurityViolation('invalid_key_format', { apiKey: apiKey.substring(0, 8) + '...' })
      return { valid: false, reason: 'Invalid API key format' }
    }

    const keyConfig = this.apiKeys.get(keyId)
    if (!keyConfig) {
      await this.logSecurityViolation('unknown_api_key', { keyId, clientIp })
      return { valid: false, reason: 'API key not found' }
    }

    // Check if key is active
    if (!keyConfig.isActive) {
      await this.logSecurityViolation('inactive_key_used', { keyId, clientIp })
      return { valid: false, reason: 'API key is inactive' }
    }

    // Check expiration
    if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
      await this.logSecurityViolation('expired_key_used', { keyId, clientIp })
      return { valid: false, reason: 'API key has expired' }
    }

    // Check IP whitelist
    if (keyConfig.ipWhitelist && clientIp && !keyConfig.ipWhitelist.includes(clientIp)) {
      await this.logSecurityViolation('ip_not_whitelisted', { keyId, clientIp })
      return { valid: false, reason: 'IP address not authorized' }
    }

    // Check permissions
    if (!keyConfig.permissions.includes(requiredPermission) && !keyConfig.permissions.includes('*')) {
      await this.logSecurityViolation('insufficient_permissions', { 
        keyId, 
        requiredPermission, 
        availablePermissions: keyConfig.permissions 
      })
      return { valid: false, reason: 'Insufficient permissions' }
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(keyId, keyConfig.rateLimits)
    if (!rateLimitResult.allowed) {
      await this.logSecurityViolation('rate_limit_exceeded', { keyId, clientIp })
      this.updateUsageStats(keyId, { rateLimitHit: true })
      return { valid: false, reason: `Rate limit exceeded: ${rateLimitResult.reason}` }
    }

    // Update usage tracking
    this.updateKeyUsage(keyId)
    
    return { valid: true, keyConfig }
  }

  /**
   * Configure external service with encrypted API key storage
   */
  async configureExternalService(config: {
    serviceName: string
    baseUrl: string
    apiKey: string
    timeout?: number
    retryAttempts?: number
    healthCheckEndpoint?: string
    rateLimits?: {
      requestsPerSecond?: number
      burstLimit?: number
    }
    circuitBreaker?: {
      failureThreshold?: number
      recoveryTimeout?: number
    }
  }): Promise<void> {
    try {
      // Encrypt the API key
      const encryptedKeyData = await this.encryptionService.encrypt(config.apiKey)
      const encryptedKey = JSON.stringify(encryptedKeyData)

      const serviceConfig: ExternalServiceConfig = {
        serviceName: config.serviceName,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey, // Store for immediate use
        encryptedKey,
        timeout: config.timeout || 30000,
        retryAttempts: config.retryAttempts || 3,
        healthCheckEndpoint: config.healthCheckEndpoint,
        rateLimits: {
          requestsPerSecond: config.rateLimits?.requestsPerSecond || 10,
          burstLimit: config.rateLimits?.burstLimit || 50
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: config.circuitBreaker?.failureThreshold || 5,
          recoveryTimeout: config.circuitBreaker?.recoveryTimeout || 60000
        },
        isHealthy: true
      }

      this.externalServices.set(config.serviceName, serviceConfig)
      
      // Initialize circuit breaker state
      this.circuitBreakerStates.set(config.serviceName, {
        state: 'CLOSED',
        failureCount: 0,
        nextAttemptTime: 0
      })

      // Perform initial health check
      if (config.healthCheckEndpoint) {
        await this.performHealthCheck(config.serviceName)
      }

      this.logger.log('External service configured', {
        serviceName: config.serviceName,
        baseUrl: config.baseUrl,
        hasHealthCheck: !!config.healthCheckEndpoint
      })

    } catch (_error) {
      this.logger.error('Failed to configure external service', {
        serviceName: config.serviceName,
        error: _error instanceof Error ? _error.message : 'Unknown error'
      })
      throw new BadRequestException('Failed to configure external service')
    }
  }

  /**
   * Get API key for external service with circuit breaker
   */
  async getExternalServiceKey(serviceName: string): Promise<string> {
    const service = this.externalServices.get(serviceName)
    if (!service) {
      throw new BadRequestException(`External service '${serviceName}' not configured`)
    }

    // Check circuit breaker state
    const circuitState = this.circuitBreakerStates.get(serviceName)
    if (circuitState?.state === 'OPEN') {
      if (Date.now() < circuitState.nextAttemptTime) {
        throw new BadRequestException(`Service '${serviceName}' is currently unavailable (circuit breaker open)`)
      } else {
        // Transition to half-open
        circuitState.state = 'HALF_OPEN'
      }
    }

    return service.apiKey
  }

  /**
   * Record external service call result for circuit breaker
   */
  async recordExternalServiceCall(
    serviceName: string, 
    success: boolean, 
    responseTime: number
  ): Promise<void> {
    const service = this.externalServices.get(serviceName)
    const circuitState = this.circuitBreakerStates.get(serviceName)
    
    if (!service || !circuitState) {
      return
    }

    if (success) {
      // Reset failure count on success
      circuitState.failureCount = 0
      if (circuitState.state === 'HALF_OPEN') {
        circuitState.state = 'CLOSED'
      }
      service.isHealthy = true
    } else {
      // Increment failure count
      circuitState.failureCount++
      
      // Check if we should open the circuit
      if (circuitState.failureCount >= service.circuitBreaker.failureThreshold) {
        circuitState.state = 'OPEN'
        circuitState.nextAttemptTime = Date.now() + service.circuitBreaker.recoveryTimeout
        service.isHealthy = false
        
        await this.securityMonitor.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          details: {
            operation: 'circuit_breaker_opened',
            serviceName,
            failureCount: circuitState.failureCount,
            recoveryTime: service.circuitBreaker.recoveryTimeout
          }
        })
      }
    }

    this.logger.debug('External service call recorded', {
      serviceName,
      success,
      responseTime,
      circuitState: circuitState.state,
      failureCount: circuitState.failureCount
    })
  }

  /**
   * Rotate API key for external service
   */
  async rotateExternalServiceKey(serviceName: string, newApiKey: string): Promise<void> {
    const service = this.externalServices.get(serviceName)
    if (!service) {
      throw new BadRequestException(`External service '${serviceName}' not configured`)
    }

    try {
      const encryptedKeyData = await this.encryptionService.encrypt(newApiKey)
      const encryptedKey = JSON.stringify(encryptedKeyData)
      
      service.apiKey = newApiKey
      service.encryptedKey = encryptedKey

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        details: {
          operation: 'external_service_key_rotated',
          serviceName
        }
      })

      this.logger.log('External service API key rotated', { serviceName })

    } catch (_error) {
      this.logger.error('Failed to rotate external service key', {
        serviceName,
        error: _error instanceof Error ? _error.message : 'Unknown error'
      })
      throw new BadRequestException('Failed to rotate API key')
    }
  }

  /**
   * Get API key usage statistics
   */
  getUsageStats(keyId?: string): ApiKeyUsageStats[] {
    if (keyId) {
      const stats = this.usageStats.get(keyId)
      return stats ? [stats] : []
    }
    
    return Array.from(this.usageStats.values())
  }

  /**
   * Get external service health status
   */
  getServiceHealthStatus(): {
    serviceName: string
    isHealthy: boolean
    circuitBreakerState: string
    lastHealthCheck?: Date
    failureCount: number
  }[] {
    return Array.from(this.externalServices.entries()).map(([serviceName, service]) => {
      const circuitState = this.circuitBreakerStates.get(serviceName)
      return {
        serviceName,
        isHealthy: service.isHealthy,
        circuitBreakerState: circuitState?.state || 'UNKNOWN',
        lastHealthCheck: service.lastHealthCheck,
        failureCount: circuitState?.failureCount || 0
      }
    })
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, reason?: string): Promise<void> {
    const keyConfig = this.apiKeys.get(keyId)
    if (!keyConfig) {
      throw new BadRequestException('API key not found')
    }

    keyConfig.isActive = false

    await this.securityMonitor.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      details: {
        operation: 'api_key_revoked',
        keyId,
        serviceName: keyConfig.serviceName,
        reason
      }
    })

    this.logger.log('API key revoked', { keyId, reason })
  }

  /**
   * Initialize external services from configuration
   */
  private initializeExternalServices(): void {
    const services = [
      {
        serviceName: 'stripe',
        baseUrl: 'https://api.stripe.com',
        apiKey: this.configService.get('STRIPE_SECRET_KEY') || '',
        healthCheckEndpoint: '/v1/charges'
      },
      {
        serviceName: 'supabase',
        baseUrl: this.configService.get('SUPABASE_URL') || '',
        apiKey: this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        healthCheckEndpoint: '/rest/v1/'
      }
    ]

    for (const service of services) {
      if (service.apiKey) {
        void this.configureExternalService(service).catch(error => {
          this.logger.warn(`Failed to configure ${service.serviceName}`, { error })
        })
      }
    }
  }

  /**
   * Perform health check for external service
   */
  private async performHealthCheck(serviceName: string): Promise<boolean> {
    const service = this.externalServices.get(serviceName)
    if (!service || !service.healthCheckEndpoint) {
      return false
    }

    try {
      const startTime = Date.now()
      const response = await fetch(`${service.baseUrl}${service.healthCheckEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${service.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(service.timeout)
      })

      const responseTime = Date.now() - startTime
      const isHealthy = response.ok

      service.lastHealthCheck = new Date()
      service.isHealthy = isHealthy

      await this.recordExternalServiceCall(serviceName, isHealthy, responseTime)

      return isHealthy
    } catch (_error) {
      service.isHealthy = false
      service.lastHealthCheck = new Date()
      await this.recordExternalServiceCall(serviceName, false, 0)
      return false
    }
  }

  /**
   * Start maintenance tasks
   */
  private startMaintenanceTasks(): void {
    // Clean up expired keys every hour
    setInterval(() => {
      this.cleanupExpiredKeys()
    }, 60 * 60 * 1000)

    // Health check external services every 5 minutes
    setInterval(() => {
      void this.performAllHealthChecks()
    }, 5 * 60 * 1000)

    // Reset rate limit counters every minute
    setInterval(() => {
      this.resetRateLimitCounters()
    }, 60 * 1000)
  }

  /**
   * Generate secure API key
   */
  private generateSecureApiKey(): string {
    const prefix = 'tk_' // TenantFlow Key
    const keyData = crypto.randomBytes(32).toString('hex')
    return `${prefix}${keyData}`
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Extract key ID from API key
   */
  private extractKeyId(apiKey: string): string | null {
    // In production, this would use proper key derivation
    // For now, use a simple hash
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 32)
  }

  /**
   * Check rate limits for API key
   */
  private async checkRateLimit(
    keyId: string, 
    limits: ApiKeyConfig['rateLimits']
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now()
    const minuteKey = `${keyId}:${Math.floor(now / 60000)}`
    const hourKey = `${keyId}:${Math.floor(now / 3600000)}`
    const dayKey = `${keyId}:${Math.floor(now / 86400000)}`

    // Check minute limit
    const minuteCount = this.rateLimitTracking.get(minuteKey)?.count || 0
    if (minuteCount >= limits.requestsPerMinute) {
      return { allowed: false, reason: 'Requests per minute limit exceeded' }
    }

    // Check hour limit
    const hourCount = this.rateLimitTracking.get(hourKey)?.count || 0
    if (hourCount >= limits.requestsPerHour) {
      return { allowed: false, reason: 'Requests per hour limit exceeded' }
    }

    // Check day limit
    const dayCount = this.rateLimitTracking.get(dayKey)?.count || 0
    if (dayCount >= limits.requestsPerDay) {
      return { allowed: false, reason: 'Requests per day limit exceeded' }
    }

    // Increment counters
    this.incrementRateLimitCounter(minuteKey)
    this.incrementRateLimitCounter(hourKey)
    this.incrementRateLimitCounter(dayKey)

    return { allowed: true }
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimitCounter(key: string): void {
    const existing = this.rateLimitTracking.get(key)
    if (existing) {
      existing.count++
    } else {
      this.rateLimitTracking.set(key, { count: 1, resetTime: Date.now() + 60000 })
    }
  }

  /**
   * Update key usage tracking
   */
  private updateKeyUsage(keyId: string): void {
    const keyConfig = this.apiKeys.get(keyId)
    if (keyConfig) {
      keyConfig.usageCount++
      keyConfig.lastUsedAt = new Date()
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(keyId: string, update: {
    success?: boolean
    responseTime?: number
    rateLimitHit?: boolean
    securityViolation?: boolean
  }): void {
    const stats = this.usageStats.get(keyId)
    if (!stats) return

    stats.totalRequests++
    stats.lastUsed = new Date()

    if (update.success !== undefined) {
      if (update.success) {
        stats.successfulRequests++
      } else {
        stats.failedRequests++
      }
    }

    if (update.responseTime !== undefined) {
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.totalRequests - 1) + update.responseTime) / stats.totalRequests
    }

    if (update.rateLimitHit) {
      stats.rateLimitHits++
    }

    if (update.securityViolation) {
      stats.securityViolations++
    }
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(type: string, details: Record<string, unknown>): Promise<void> {
    await this.securityMonitor.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      details: {
        operation: 'api_key_security_violation',
        violationType: type,
        ...details
      }
    })
  }

  /**
   * Clean up expired API keys
   */
  private cleanupExpiredKeys(): void {
    const now = new Date()
    let cleanupCount = 0

    for (const [keyId, config] of this.apiKeys.entries()) {
      if (config.expiresAt && config.expiresAt < now) {
        this.apiKeys.delete(keyId)
        this.usageStats.delete(keyId)
        cleanupCount++
      }
    }

    if (cleanupCount > 0) {
      this.logger.log(`Cleaned up ${cleanupCount} expired API keys`)
    }
  }

  /**
   * Perform health checks for all external services
   */
  private async performAllHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.externalServices.keys()).map(serviceName =>
      this.performHealthCheck(serviceName).catch(error => {
        this.logger.warn(`Health check failed for ${serviceName}`, { error })
        return false
      })
    )

    await Promise.all(healthPromises)
  }

  /**
   * Reset rate limit counters
   */
  private resetRateLimitCounters(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, data] of this.rateLimitTracking.entries()) {
      if (now > data.resetTime) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.rateLimitTracking.delete(key))
  }
}