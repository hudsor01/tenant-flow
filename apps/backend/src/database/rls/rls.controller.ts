import { Controller, Get, Post, UseGuards, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { Roles } from '../../auth/decorators/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { RLSService } from './rls.service'
import { USER_ROLE } from '@tenantflow/shared'

@ApiTags('RLS Management')
@ApiBearerAuth()
@Controller('api/admin/rls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RLSController {
  constructor(private readonly rlsService: RLSService) {}

  @Get('status')
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({ summary: 'Get RLS status for all tables' })
  @ApiResponse({ status: 200, description: 'RLS status retrieved successfully' })
  async getRLSStatus() {
    try {
      const status = await this.rlsService.verifyRLSEnabled()
      return {
        success: true,
        data: status,
        summary: {
          total: status.length,
          enabled: status.filter(s => s.enabled).length,
          disabled: status.filter(s => !s.enabled).length
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new HttpException(
        {
          error: {
            message: 'Failed to retrieve RLS status',
            code: 'RLS_STATUS_ERROR',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            details: errorMessage
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('audit')
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({ summary: 'Generate RLS audit report' })
  @ApiResponse({ status: 200, description: 'Audit report generated successfully' })
  async generateAuditReport() {
    try {
      const report = await this.rlsService.generateRLSAuditReport()
      return {
        success: true,
        data: report
      }
    } catch (error: unknown) {
      throw new HttpException(
        {
          error: {
            message: 'Failed to generate audit report',
            code: 'RLS_AUDIT_ERROR',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Post('apply')
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({ summary: 'Apply RLS policies to database' })
  @ApiResponse({ status: 200, description: 'RLS policies applied successfully' })
  @ApiResponse({ status: 500, description: 'Failed to apply RLS policies' })
  async applyRLSPolicies() {
    try {
      const result = await this.rlsService.applyRLSPolicies()
      
      if (!result.success) {
        throw new HttpException(
          {
            error: {
              message: 'Failed to apply some RLS policies',
              code: 'RLS_APPLY_PARTIAL_FAILURE',
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              details: result.errors
            }
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      }

      return {
        success: true,
        message: 'RLS policies applied successfully'
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error
      }
      
      throw new HttpException(
        {
          error: {
            message: 'Failed to apply RLS policies',
            code: 'RLS_APPLY_ERROR',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  @Get('test/:userId')
  @Roles(USER_ROLE.ADMIN)
  @ApiOperation({ summary: 'Test RLS policies for a specific user' })
  @ApiResponse({ status: 200, description: 'RLS test results' })
  async testUserAccess(userId: string) {
    try {
      // Get user role from database
      const userRole = 'OWNER' // This would be fetched from database
      
      const results = await this.rlsService.testRLSPolicies(userId, userRole as 'OWNER' | 'TENANT' | 'ADMIN')
      
      return {
        success: true,
        userId,
        role: userRole,
        testResults: results
      }
    } catch (error: unknown) {
      throw new HttpException(
        {
          error: {
            message: 'Failed to test RLS policies',
            code: 'RLS_TEST_ERROR',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }
}