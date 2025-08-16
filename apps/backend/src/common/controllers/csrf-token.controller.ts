import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { CsrfTokenService } from '../security/csrf-token.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CsrfExempt } from '../guards/csrf.guard'
import { RequestUtilsService } from '../utils/request-utils.service'

interface CsrfTokenResponse {
  token: string
  type: 'stateful' | 'stateless'
  expiresAt: string
  sessionId: string
}

interface CsrfStatsResponse {
  totalTokens: number
  activeSessions: number
  oldestToken?: string
  newestToken?: string
}

@Controller('csrf')
@UseGuards(JwtAuthGuard)
export class CsrfTokenController {
  private readonly logger = new Logger(CsrfTokenController.name)

  constructor(
    private readonly csrfTokenService: CsrfTokenService,
    private readonly requestUtils: RequestUtilsService
  ) {}

  /**
   * Generate a new CSRF token for the current session
   */
  @Get('token')
  @CsrfExempt() // Token generation itself should be exempt from CSRF protection
  @HttpCode(HttpStatus.OK)
  generateToken(@Req() request: FastifyRequest): CsrfTokenResponse {
    const sessionId = this.requestUtils.extractSessionId(request)
    
    if (!sessionId) {
      this.logger.warn('Token generation attempted without valid session', {
        ip: this.requestUtils.getClientIP(request),
        userAgent: request.headers['user-agent']
      })
      throw new Error('Valid session required for CSRF token generation')
    }

    // Generate stateful token by default
    const tokenData = this.csrfTokenService.generateToken(sessionId)
    
    this.logger.debug('CSRF token generated', {
      sessionId,
      tokenPrefix: tokenData.token.substring(0, 16),
      expiresAt: tokenData.expiresAt
    })

    return {
      token: tokenData.token,
      type: 'stateful',
      expiresAt: tokenData.expiresAt.toISOString(),
      sessionId: tokenData.sessionId
    }
  }

  /**
   * Generate a stateless CSRF token (HMAC-based, no server storage)
   */
  @Get('token/stateless')
  @CsrfExempt() // Token generation itself should be exempt from CSRF protection
  @HttpCode(HttpStatus.OK)
  generateStatelessToken(@Req() request: FastifyRequest): CsrfTokenResponse {
    const sessionId = this.requestUtils.extractSessionId(request)
    
    if (!sessionId) {
      this.logger.warn('Stateless token generation attempted without valid session', {
        ip: this.requestUtils.getClientIP(request),
        userAgent: request.headers['user-agent']
      })
      throw new Error('Valid session required for CSRF token generation')
    }

    const token = this.csrfTokenService.generateStatelessToken(sessionId)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    
    this.logger.debug('Stateless CSRF token generated', {
      sessionId,
      tokenPrefix: token.substring(0, 16)
    })

    return {
      token,
      type: 'stateless',
      expiresAt: expiresAt.toISOString(),
      sessionId
    }
  }

  /**
   * Validate a CSRF token (for testing purposes)
   */
  @Post('validate')
  @CsrfExempt() // Validation endpoint should be exempt to test tokens
  @HttpCode(HttpStatus.OK)
  validateToken(
    @Req() request: FastifyRequest
  ): {
    valid: boolean
    type?: 'stateful' | 'stateless'
    sessionId?: string
    error?: string
  } {
    const sessionId = this.requestUtils.extractSessionId(request)
    const token = this.requestUtils.extractCsrfToken(request)
    
    if (!sessionId) {
      return {
        valid: false,
        error: 'No valid session found'
      }
    }
    
    if (!token) {
      return {
        valid: false,
        error: 'No CSRF token provided'
      }
    }

    // Try both validation methods
    const isValidStateful = this.csrfTokenService.validateToken(token, sessionId)
    const isValidStateless = this.csrfTokenService.validateStatelessToken(token, sessionId)
    
    if (isValidStateful) {
      return {
        valid: true,
        type: 'stateful',
        sessionId
      }
    }
    
    if (isValidStateless) {
      return {
        valid: true,
        type: 'stateless',
        sessionId
      }
    }
    
    return {
      valid: false,
      error: 'Token validation failed'
    }
  }

  /**
   * Revoke all CSRF tokens for the current session
   */
  @Delete('tokens')
  @CsrfExempt() // Token revocation should be exempt
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSessionTokens(@Req() request: FastifyRequest): void {
    const sessionId = this.requestUtils.extractSessionId(request)
    
    if (!sessionId) {
      this.logger.warn('Token revocation attempted without valid session', {
        ip: this.requestUtils.getClientIP(request)
      })
      throw new Error('Valid session required for token revocation')
    }

    this.csrfTokenService.revokeSessionTokens(sessionId)
    
    this.logger.debug('Session CSRF tokens revoked', { sessionId })
  }

  /**
   * Get CSRF token statistics (admin endpoint)
   */
  @Get('stats')
  @CsrfExempt() // Stats endpoint should be exempt
  @HttpCode(HttpStatus.OK)
  getTokenStats(): CsrfStatsResponse {
    const stats = this.csrfTokenService.getTokenStats()
    
    return {
      totalTokens: stats.totalTokens,
      activeSessions: stats.activeSessions,
      oldestToken: stats.oldestToken?.toISOString(),
      newestToken: stats.newestToken?.toISOString()
    }
  }

  /**
   * Health check for CSRF token service
   */
  @Get('health')
  @CsrfExempt() // Health check should be exempt
  @HttpCode(HttpStatus.OK)
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: {
      totalTokens: number
      activeSessions: number
    }
    timestamp: string
  } {
    const stats = this.csrfTokenService.getTokenStats()
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    // Consider service degraded if too many tokens (potential memory leak)
    if (stats.totalTokens > 10000) {
      status = 'degraded'
    }
    
    // Consider service unhealthy if extremely high token count
    if (stats.totalTokens > 50000) {
      status = 'unhealthy'
    }

    return {
      status,
      details: {
        totalTokens: stats.totalTokens,
        activeSessions: stats.activeSessions
      },
      timestamp: new Date().toISOString()
    }
  }

}