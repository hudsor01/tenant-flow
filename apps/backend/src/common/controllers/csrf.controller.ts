import { Controller, Get, Logger, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Public } from '../../auth/decorators/public.decorator'
import type { FastifyRequest } from 'fastify'

/**
 * CSRF Token Controller
 * 
 * Provides CSRF tokens for frontend applications to include in state-changing requests
 */
@ApiTags('Security')
@Controller('csrf')
export class CsrfController {
  private readonly logger = new Logger(CsrfController.name)

  /**
   * Get CSRF token for the current session
   * 
   * Frontend applications should call this endpoint to get a CSRF token,
   * then include it in subsequent POST, PUT, PATCH, DELETE requests.
   */
  @Get('token')
  @Public() // SECURITY FIX: CSRF token endpoint must be public to bootstrap authentication
  @ApiOperation({ 
    summary: 'Get CSRF token',
    description: 'Retrieves a CSRF token that must be included in state-changing requests'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'CSRF token retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'CSRF token to include in requests'
        }
      }
    }
  })
  async getCsrfToken(@Req() request: FastifyRequest & { generateCsrf?: () => string }): Promise<{ token: string, expiresIn: string }> {
    try {
      // Generate CSRF token using Fastify CSRF protection
      let token: string
      
      if (typeof request.generateCsrf === 'function') {
        // generateCsrf is synchronous in @fastify/csrf-protection
        token = request.generateCsrf()
        this.logger.debug('CSRF token generated successfully')
      } else {
        // Fallback for development or if CSRF is not configured
        this.logger.warn('CSRF protection not configured - using placeholder token')
        token = 'csrf-not-configured-' + Date.now()
      }
      
      return { 
        token,
        expiresIn: '24h' // Token expiry information for frontend
      }
    } catch (error) {
      this.logger.error('Failed to generate CSRF token:', error)
      throw error
    }
  }
}