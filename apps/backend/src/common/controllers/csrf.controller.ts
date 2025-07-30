import { Controller, Get, Logger, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
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
  async getCsrfToken(@Req() request: FastifyRequest & { generateCsrf?: () => Promise<string> }): Promise<{ token: string }> {
    try {
      // For Fastify with @fastify/csrf-protection, the token generation method
      // is available on the request object
      const token = request.generateCsrf ? await request.generateCsrf() : 'csrf-not-configured'
      
      this.logger.debug('CSRF token generated successfully')
      
      return { token }
    } catch (error) {
      this.logger.error('Failed to generate CSRF token:', error)
      throw error
    }
  }
}