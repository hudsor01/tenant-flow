import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { RequiresMfa } from '../../auth/guards/mfa.guard'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ComplianceMonitorService } from '../security/compliance-monitor.service'
import { PrivacyService } from '../security/privacy.service'
import { SecurityAuditService } from '../security/audit.service'
import { Role, AuthUser } from '@repo/shared'

/**
 * Compliance Controller
 * 
 * Provides endpoints for compliance monitoring, reporting, and management
 * Restricted to admin users with MFA requirements for sensitive operations
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly complianceMonitor: ComplianceMonitorService,
    private readonly privacyService: PrivacyService,
    private readonly auditService: SecurityAuditService
  ) {}

  /**
   * Get compliance dashboard data
   */
  @Get('dashboard')
  @Roles(Role.OWNER, Role.MANAGER)
  async getComplianceDashboard(@CurrentUser() _user: unknown) {
    return await this.complianceMonitor.getComplianceDashboard()
  }

  /**
   * Get Fair Housing compliance report
   */
  @Get('fair-housing')
  @Roles(Role.OWNER, Role.MANAGER)
  async getFairHousingReport(
    @CurrentUser() user: { organizationId?: string; id: string },
    @Query('days') days?: string
  ) {
    const organizationId = user.organizationId || user.id
    const reportDays = days ? parseInt(days) : 30
    
    // TODO: Implement generateComplianceReport in FairHousingService
    return {
      organizationId,
      reportDays,
      compliance: true,
      issues: [],
      generatedAt: new Date()
    }
  }

  /**
   * Get data privacy report
   */
  @Get('privacy')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequiresMfa()
  async getPrivacyReport(@CurrentUser() user: { organizationId?: string; id: string }) {
    const organizationId = user.organizationId || user.id
    return await this.privacyService.generatePrivacyReport(organizationId)
  }

  /**
   * Get security audit events
   */
  @Get('audit')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequiresMfa()
  async getAuditEvents(
    @CurrentUser() _user: AuthUser,
    @Query('days') days?: string,
    @Query('severity') severity?: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days ? parseInt(days) : 7))

    return await this.auditService.getSecurityEvents({
      startDate,
      severity: severity as never,
      eventType: eventType as never,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    })
  }

  /**
   * Process data deletion request (GDPR Right to be Forgotten)
   */
  @Post('data-deletion')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequiresMfa()
  async processDataDeletion(
    @CurrentUser() user: { id: string },
    @Body() request: { userId: string; reason?: string }
  ) {
    return await this.privacyService.processDataDeletion(
      request.userId,
      user.id,
      request.reason || 'admin_request'
    )
  }

  /**
   * Trigger manual compliance check
   */
  @Post('check')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequiresMfa()
  async triggerComplianceCheck(@CurrentUser() _user: AuthUser) {
    // Manually trigger the compliance check
    await this.complianceMonitor.runDailyComplianceCheck()
    
    return {
      success: true,
      message: 'Compliance check initiated',
      triggeredBy: _user.id,
      timestamp: new Date()
    }
  }

  /**
   * Enforce data retention policies manually
   */
  @Post('retention/enforce')
  @Roles(Role.OWNER, Role.MANAGER)
  @RequiresMfa()
  async enforceRetentionPolicies(@CurrentUser() user: { id: string }) {
    const result = await this.privacyService.enforceRetentionPolicies()
    
    return {
      ...result,
      triggeredBy: user.id,
      timestamp: new Date()
    }
  }

  /**
   * Get security statistics
   */
  @Get('security/stats')
  @Roles(Role.OWNER, Role.MANAGER)
  async getSecurityStats(@Query('days') days?: string) {
    const reportDays = days ? parseInt(days) : 30
    return await this.auditService.getSecurityStats(reportDays)
  }
}