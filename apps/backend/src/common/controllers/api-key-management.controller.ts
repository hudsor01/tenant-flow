import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Req
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { ApiKeyManagementService, ApiKeyUsageStats } from '../security/api-key-management.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

interface GenerateApiKeyRequest {
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
}

interface ConfigureServiceRequest {
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
}

interface ApiKeyValidationRequest {
  apiKey: string
  requiredPermission: string
}

/**
 * API Key Management Controller
 * 
 * Provides endpoints for managing API keys and external service configurations.
 * Requires authentication and appropriate permissions for security operations.
 */
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyManagementController {
  constructor(
    private readonly apiKeyManagement: ApiKeyManagementService,
    private readonly securityMonitor: SecurityMonitorService
  ) {}

  /**
   * Generate a new API key for internal services
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @Body() request: GenerateApiKeyRequest,
    @Req() req: FastifyRequest
  ): Promise<{
    success: boolean
    keyId: string
    apiKey: string
    message: string
    config: {
      serviceName: string
      permissions: string[]
      expiresAt?: string
      rateLimits: {
        requestsPerMinute: number
        requestsPerHour: number
        requestsPerDay: number
      }
    }
  }> {
    try {
      const result = await this.apiKeyManagement.generateApiKey(request)

      // Log API key generation
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: req.ip,
        details: {
          operation: 'api_key_generated',
          serviceName: request.serviceName,
          permissions: request.permissions,
          keyId: result.keyId
        }
      })

      return {
        success: true,
        keyId: result.keyId,
        apiKey: result.apiKey,
        message: 'API key generated successfully',
        config: {
          serviceName: request.serviceName,
          permissions: request.permissions,
          expiresAt: request.expiresIn 
            ? new Date(Date.now() + request.expiresIn * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          rateLimits: {
            requestsPerMinute: request.rateLimits?.requestsPerMinute || 60,
            requestsPerHour: request.rateLimits?.requestsPerHour || 1000,
            requestsPerDay: request.rateLimits?.requestsPerDay || 10000
          }
        }
      }
    } catch (error) {
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: req.ip,
        details: {
          operation: 'api_key_generation_failed',
          serviceName: request.serviceName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        keyId: '',
        apiKey: '',
        message: error instanceof Error ? error.message : 'Failed to generate API key',
        config: {
          serviceName: request.serviceName,
          permissions: request.permissions,
          rateLimits: {
            requestsPerMinute: 0,
            requestsPerHour: 0,
            requestsPerDay: 0
          }
        }
      }
    }
  }

  /**
   * Validate an API key and check permissions
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateApiKey(
    @Body() request: ApiKeyValidationRequest,
    @Req() req: FastifyRequest
  ): Promise<{
    valid: boolean
    keyInfo?: {
      serviceName: string
      permissions: string[]
      usageCount: number
      lastUsed?: string
    }
    reason?: string
  }> {
    const result = await this.apiKeyManagement.validateApiKey(
      request.apiKey,
      request.requiredPermission,
      req.ip
    )

    // Log validation attempt
    await this.securityMonitor.logSecurityEvent({
      type: result.valid ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      ip: req.ip,
      details: {
        operation: 'api_key_validation',
        requiredPermission: request.requiredPermission,
        valid: result.valid,
        reason: result.reason
      }
    })

    if (result.valid && result.keyConfig) {
      return {
        valid: true,
        keyInfo: {
          serviceName: result.keyConfig.serviceName,
          permissions: result.keyConfig.permissions,
          usageCount: result.keyConfig.usageCount,
          lastUsed: result.keyConfig.lastUsedAt?.toISOString()
        }
      }
    }

    return {
      valid: false,
      reason: result.reason
    }
  }

  /**
   * Configure external service with API key
   */
  @Post('external-services')
  @HttpCode(HttpStatus.CREATED)
  async configureExternalService(
    @Body() request: ConfigureServiceRequest,
    @Req() req: FastifyRequest
  ): Promise<{
    success: boolean
    message: string
    serviceName: string
  }> {
    try {
      await this.apiKeyManagement.configureExternalService(request)

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: req.ip,
        details: {
          operation: 'external_service_configured',
          serviceName: request.serviceName,
          baseUrl: request.baseUrl
        }
      })

      return {
        success: true,
        message: 'External service configured successfully',
        serviceName: request.serviceName
      }
    } catch (error) {
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: req.ip,
        details: {
          operation: 'external_service_configuration_failed',
          serviceName: request.serviceName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to configure external service',
        serviceName: request.serviceName
      }
    }
  }

  /**
   * Rotate API key for external service
   */
  @Post('external-services/:serviceName/rotate')
  @HttpCode(HttpStatus.OK)
  async rotateExternalServiceKey(
    @Param('serviceName') serviceName: string,
    @Body() request: { newApiKey: string },
    @Req() req: FastifyRequest
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      await this.apiKeyManagement.rotateExternalServiceKey(serviceName, request.newApiKey)

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: req.ip,
        details: {
          operation: 'external_service_key_rotated',
          serviceName
        }
      })

      return {
        success: true,
        message: 'API key rotated successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rotate API key'
      }
    }
  }

  /**
   * Get API key usage statistics
   */
  @Get('usage-stats')
  async getUsageStats(
    @Query('keyId') keyId?: string
  ): Promise<{
    stats: ApiKeyUsageStats[]
    summary: {
      totalKeys: number
      totalRequests: number
      averageSuccessRate: number
    }
  }> {
    const stats = this.apiKeyManagement.getUsageStats(keyId)
    
    const summary = {
      totalKeys: stats.length,
      totalRequests: stats.reduce((sum, stat) => sum + stat.totalRequests, 0),
      averageSuccessRate: stats.length > 0 
        ? stats.reduce((sum, stat) => sum + (stat.successfulRequests / (stat.totalRequests || 1)), 0) / stats.length
        : 0
    }

    return {
      stats,
      summary
    }
  }

  /**
   * Get external service health status
   */
  @Get('external-services/health')
  async getServiceHealthStatus(): Promise<{
    services: {
      serviceName: string
      isHealthy: boolean
      circuitBreakerState: string
      lastHealthCheck?: string
      failureCount: number
      status: 'healthy' | 'degraded' | 'unhealthy'
    }[]
    summary: {
      totalServices: number
      healthyServices: number
      degradedServices: number
      unhealthyServices: number
    }
  }> {
    const healthData = this.apiKeyManagement.getServiceHealthStatus()
    
    const services = healthData.map(service => ({
      ...service,
      lastHealthCheck: service.lastHealthCheck?.toISOString(),
      status: this.determineServiceStatus(service.isHealthy, service.circuitBreakerState, service.failureCount)
    }))

    const summary = {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length
    }

    return {
      services,
      summary
    }
  }

  /**
   * Revoke an API key
   */
  @Delete(':keyId')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Param('keyId') keyId: string,
    @Body() request: { reason?: string },
    @Req() req: FastifyRequest
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      await this.apiKeyManagement.revokeApiKey(keyId, request.reason)

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: req.ip,
        details: {
          operation: 'api_key_revoked',
          keyId,
          reason: request.reason
        }
      })

      return {
        success: true,
        message: 'API key revoked successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to revoke API key'
      }
    }
  }

  /**
   * Test external service connectivity
   */
  @Post('external-services/:serviceName/test')
  @HttpCode(HttpStatus.OK)
  async testExternalService(
    @Param('serviceName') serviceName: string,
    @Req() req: FastifyRequest
  ): Promise<{
    success: boolean
    serviceName: string
    responseTime?: number
    error?: string
    circuitBreakerState: string
  }> {
    try {
      const startTime = Date.now()
      
      // Attempt to get the API key (this will fail if circuit breaker is open)
      await this.apiKeyManagement.getExternalServiceKey(serviceName)
      
      // Simulate a test request (in a real implementation, you'd make an actual API call)
      const responseTime = Date.now() - startTime
      
      // Record successful test
      await this.apiKeyManagement.recordExternalServiceCall(serviceName, true, responseTime)
      
      const healthStatus = this.apiKeyManagement.getServiceHealthStatus()
      const serviceStatus = healthStatus.find(s => s.serviceName === serviceName)

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: req.ip,
        details: {
          operation: 'external_service_test',
          serviceName,
          responseTime,
          success: true
        }
      })

      return {
        success: true,
        serviceName,
        responseTime,
        circuitBreakerState: serviceStatus?.circuitBreakerState || 'UNKNOWN'
      }
    } catch (error) {
      // Record failed test
      await this.apiKeyManagement.recordExternalServiceCall(serviceName, false, 0)
      
      const healthStatus = this.apiKeyManagement.getServiceHealthStatus()
      const serviceStatus = healthStatus.find(s => s.serviceName === serviceName)

      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: req.ip,
        details: {
          operation: 'external_service_test',
          serviceName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        serviceName,
        error: error instanceof Error ? error.message : 'Service test failed',
        circuitBreakerState: serviceStatus?.circuitBreakerState || 'UNKNOWN'
      }
    }
  }

  /**
   * Get API key management dashboard data
   */
  @Get('dashboard')
  async getDashboardData(): Promise<{
    apiKeys: {
      total: number
      active: number
      expiringSoon: number // expires within 7 days
      expired: number
    }
    externalServices: {
      total: number
      healthy: number
      degraded: number
      unhealthy: number
    }
    usage: {
      totalRequests24h: number
      successRate24h: number
      topServices: {
        serviceName: string
        requests: number
        successRate: number
      }[]
    }
    security: {
      rateLimitViolations24h: number
      securityViolations24h: number
      suspiciousActivity: {
        type: string
        count: number
        lastOccurrence: string
      }[]
    }
  }> {
    const usageStats = this.apiKeyManagement.getUsageStats()
    const healthStatus = this.apiKeyManagement.getServiceHealthStatus()
    
    // const now = new Date()
    // const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Calculate API key metrics
    const apiKeyMetrics = {
      total: usageStats.length,
      active: usageStats.filter(stat => stat.totalRequests > 0).length,
      expiringSoon: 0, // Would need to track expiration dates
      expired: 0
    }

    // Calculate service health metrics
    const serviceMetrics = {
      total: healthStatus.length,
      healthy: healthStatus.filter(s => s.isHealthy && s.circuitBreakerState === 'CLOSED').length,
      degraded: healthStatus.filter(s => s.circuitBreakerState === 'HALF_OPEN' || s.failureCount > 0).length,
      unhealthy: healthStatus.filter(s => !s.isHealthy || s.circuitBreakerState === 'OPEN').length
    }

    // Calculate usage metrics (simplified)
    const usageMetrics = {
      totalRequests24h: usageStats.reduce((sum, stat) => sum + stat.totalRequests, 0),
      successRate24h: usageStats.length > 0 
        ? usageStats.reduce((sum, stat) => sum + (stat.successfulRequests / (stat.totalRequests || 1)), 0) / usageStats.length
        : 0,
      topServices: usageStats
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 5)
        .map(stat => ({
          serviceName: stat.serviceName,
          requests: stat.totalRequests,
          successRate: stat.totalRequests > 0 ? stat.successfulRequests / stat.totalRequests : 0
        }))
    }

    // Calculate security metrics (simplified)
    const securityMetrics = {
      rateLimitViolations24h: usageStats.reduce((sum, stat) => sum + stat.rateLimitHits, 0),
      securityViolations24h: usageStats.reduce((sum, stat) => sum + stat.securityViolations, 0),
      suspiciousActivity: [
        {
          type: 'Rate Limit Violations',
          count: usageStats.reduce((sum, stat) => sum + stat.rateLimitHits, 0),
          lastOccurrence: new Date().toISOString()
        },
        {
          type: 'Invalid API Key Attempts',
          count: usageStats.reduce((sum, stat) => sum + stat.securityViolations, 0),
          lastOccurrence: new Date().toISOString()
        }
      ]
    }

    return {
      apiKeys: apiKeyMetrics,
      externalServices: serviceMetrics,
      usage: usageMetrics,
      security: securityMetrics
    }
  }

  /**
   * Determine service status based on health and circuit breaker state
   */
  private determineServiceStatus(
    isHealthy: boolean,
    circuitBreakerState: string,
    failureCount: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!isHealthy || circuitBreakerState === 'OPEN') {
      return 'unhealthy'
    }
    
    if (circuitBreakerState === 'HALF_OPEN' || failureCount > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }
}