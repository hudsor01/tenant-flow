import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { MfaGuard, RequiresMfa } from '../../auth/guards/mfa.guard'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ComplianceMonitorService } from '../security/compliance-monitor.service'
import { FairHousingService } from '../security/fair-housing.service'
import { PrivacyService } from '../security/privacy.service'
import { SecurityAuditService } from '../security/audit.service'
import { Role } from '@tenantflow/shared'

/**
 * Compliance Controller
 * 
 * Provides endpoints for compliance monitoring, reporting, and management
 * Restricted to admin users with MFA requirements for sensitive operations
 */
@UseGuards(JwtAuthGuard, RolesGuard, MfaGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly complianceMonitor: ComplianceMonitorService,
    private readonly fairHousingService: FairHousingService,
    private readonly privacyService: PrivacyService,
    private readonly auditService: SecurityAuditService
  ) {}

  /**
   * Get compliance dashboard data
   */
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getComplianceDashboard(@CurrentUser() _user: unknown) {
    return await this.complianceMonitor.getComplianceDashboard()
  }

  /**
   * Get Fair Housing compliance report
   */
  @Get('fair-housing')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.PROPERTY_OWNER)
  async getFairHousingReport(
    @CurrentUser() user: { organizationId?: string; id: string },
    @Query('days') days?: string
  ) {
    const organizationId = user.organizationId || user.id
    const reportDays = days ? parseInt(days) : 30
    
    return await this.fairHousingService.generateComplianceReport(organizationId, reportDays)
  }

  /**
   * Get data privacy report
   */
  @Get('privacy')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequiresMfa()
  async getPrivacyReport(@CurrentUser() user: { organizationId?: string; id: string }) {
    const organizationId = user.organizationId || user.id
    return await this.privacyService.generatePrivacyReport(organizationId)
  }

  /**
   * Get security audit events
   */
  @Get('audit')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequiresMfa()
  async getAuditEvents(
    @CurrentUser() _user: unknown,
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequiresMfa()
  async triggerComplianceCheck(@CurrentUser() _user: unknown) {
    // Manually trigger the compliance check
    await this.complianceMonitor.runDailyComplianceCheck()
    
    return {
      success: true,
      message: 'Compliance check initiated',
      triggeredBy: user.id,
      timestamp: new Date()
    }
  }

  /**
   * Enforce data retention policies manually
   */
  @Post('retention/enforce')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getSecurityStats(@Query('days') days?: string) {
    const reportDays = days ? parseInt(days) : 30
    return await this.auditService.getSecurityStats(reportDays)
  }
}