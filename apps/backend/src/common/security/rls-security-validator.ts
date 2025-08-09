import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'

export interface RLSValidationResult {
  tableName: string
  hasRLSEnabled: boolean
  policies: {
    name: string
    command: string
    role: string
    using?: string
    withCheck?: string
  }[]
  securityStatus: 'SECURE' | 'WARNING' | 'VULNERABLE'
  issues: string[]
  recommendations: string[]
}

export interface RLSSecurityReport {
  overallSecurity: 'SECURE' | 'NEEDS_ATTENTION' | 'VULNERABLE'
  totalTables: number
  secureTablesCount: number
  vulnerableTablesCount: number
  warningTablesCount: number
  results: RLSValidationResult[]
  criticalIssues: string[]
  recommendations: string[]
}

/**
 * RLS (Row Level Security) Security Validator
 * 
 * Validates that Row Level Security is properly configured for all tenant-sensitive tables.
 * This is critical for multi-tenant security in TenantFlow.
 */
@Injectable()
export class RLSSecurityValidator {
  private readonly logger = new Logger(RLSSecurityValidator.name)
  
  // Tables that must have RLS enabled for multi-tenant security
  private readonly TENANT_SENSITIVE_TABLES = [
    'User',
    'Property', 
    'Unit',
    'Tenant',
    'Lease',
    'MaintenanceRequest',
    'Organization',
    'Subscription',
    'BillingHistory'
  ]
  
  // Tables that may not need RLS (system tables, etc.)
  // Currently unused but kept for future extensibility
  // private readonly RLS_EXEMPT_TABLES = [
  //   'WebhookEvent', // System events, not tenant-specific
  //   '_prisma_migrations' // Prisma internal table
  // ]

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  /**
   * Run comprehensive RLS security validation
   */
  async validateRLSSecurity(): Promise<RLSSecurityReport> {
    this.logger.log('🔒 Starting RLS Security Validation...')
    
    const results: RLSValidationResult[] = []
    const criticalIssues: string[] = []
    const recommendations: string[] = []
    
    // Check if we're connected to the right database
    await this.validateDatabaseConnection()
    
    // Check each tenant-sensitive table
    for (const tableName of this.TENANT_SENSITIVE_TABLES) {
      try {
        const result = await this.validateTableRLS(tableName)
        results.push(result)
        
        if (result.securityStatus === 'VULNERABLE') {
          criticalIssues.push(`${tableName}: ${result.issues.join(', ')}`)
        }
        
        recommendations.push(...result.recommendations)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed to validate RLS for ${tableName}:`, errorMessage)
        
        results.push({
          tableName,
          hasRLSEnabled: false,
          policies: [],
          securityStatus: 'VULNERABLE',
          issues: [`Failed to check RLS: ${errorMessage}`],
          recommendations: [`Investigate RLS configuration for ${tableName}`]
        })
        
        criticalIssues.push(`${tableName}: Failed to validate RLS policies`)
      }
    }
    
    // Generate overall security assessment
    const secureTablesCount = results.filter(r => r.securityStatus === 'SECURE').length
    const warningTablesCount = results.filter(r => r.securityStatus === 'WARNING').length
    const vulnerableTablesCount = results.filter(r => r.securityStatus === 'VULNERABLE').length
    
    let overallSecurity: 'SECURE' | 'NEEDS_ATTENTION' | 'VULNERABLE'
    
    if (vulnerableTablesCount > 0) {
      overallSecurity = 'VULNERABLE'
    } else if (warningTablesCount > 0) {
      overallSecurity = 'NEEDS_ATTENTION'
    } else {
      overallSecurity = 'SECURE'
    }
    
    // Add general recommendations
    if (overallSecurity !== 'SECURE') {
      recommendations.push(
        '🔒 Enable RLS on all tenant-sensitive tables',
        '📝 Create policies that filter by organization/tenant ID',
        '🧪 Test RLS policies with different user contexts',
        '📊 Monitor RLS policy performance impact'
      )
    }
    
    const report: RLSSecurityReport = {
      overallSecurity,
      totalTables: results.length,
      secureTablesCount,
      vulnerableTablesCount,
      warningTablesCount,
      results,
      criticalIssues,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    }
    
    this.logSecurityReport(report)
    
    return report
  }
  
  /**
   * Validate RLS configuration for a specific table
   */
  private async validateTableRLS(tableName: string): Promise<RLSValidationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Convert Prisma model name to PostgreSQL table name (snake_case)
    const pgTableName = this.convertToPgTableName(tableName)
    
    // Check if RLS is enabled
    const rlsStatus = await this.checkRLSEnabled(pgTableName)
    
    if (!rlsStatus.enabled) {
      issues.push('RLS is not enabled')
      recommendations.push(`Enable RLS: ALTER TABLE ${pgTableName} ENABLE ROW LEVEL SECURITY;`)
    }
    
    // Get RLS policies
    const policies = await this.getRLSPolicies(pgTableName)
    
    // Analyze policies
    const policyAnalysis = this.analyzePolicies(policies, tableName)
    issues.push(...policyAnalysis.issues)
    recommendations.push(...policyAnalysis.recommendations)
    
    // Determine security status
    let securityStatus: 'SECURE' | 'WARNING' | 'VULNERABLE'
    
    if (!rlsStatus.enabled || issues.some(issue => issue.includes('no policies') || issue.includes('not enabled'))) {
      securityStatus = 'VULNERABLE'
    } else if (issues.length > 0) {
      securityStatus = 'WARNING'
    } else {
      securityStatus = 'SECURE'
    }
    
    return {
      tableName,
      hasRLSEnabled: rlsStatus.enabled,
      policies,
      securityStatus,
      issues,
      recommendations
    }
  }
  
  /**
   * Check if RLS is enabled for a table
   */
  private async checkRLSEnabled(tableName: string): Promise<{ enabled: boolean, forced: boolean }> {
    try {
      const result = await this.prisma.$queryRaw<{ relrowsecurity: boolean, relforcerowsecurity: boolean }[]>`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class 
        WHERE relname = ${tableName}
      `
      
      if (result.length === 0) {
        throw new Error(`Table ${tableName} not found`)
      }
      
      return {
        enabled: result[0]?.relrowsecurity ?? false,
        forced: result[0]?.relforcerowsecurity ?? false
      }
    } catch (error) {
      this.logger.error(`Failed to check RLS status for ${tableName}:`, error)
      return { enabled: false, forced: false }
    }
  }
  
  /**
   * Get RLS policies for a table
   */
  private async getRLSPolicies(tableName: string): Promise<{
    name: string
    command: string
    role: string
    using?: string
    withCheck?: string
  }[]> {
    try {
      const result = await this.prisma.$queryRaw<{
        policyname: string
        cmd: string
        roles: string[]
        qual?: string
        with_check?: string
      }[]>`
        SELECT 
          pol.policyname,
          pol.cmd,
          pol.roles,
          pol.qual,
          pol.with_check
        FROM pg_policy pol
        JOIN pg_class pc ON pol.polrelid = pc.oid
        WHERE pc.relname = ${tableName}
        ORDER BY pol.policyname
      `
      
      return result.map(policy => ({
        name: policy.policyname,
        command: policy.cmd,
        role: policy.roles.join(', '),
        using: policy.qual || undefined,
        withCheck: policy.with_check || undefined
      }))
    } catch (error) {
      this.logger.error(`Failed to get RLS policies for ${tableName}:`, error)
      return []
    }
  }
  
  /**
   * Analyze RLS policies for security issues
   */
  private analyzePolicies(policies: {
    name: string
    command: string
    role: string
    using?: string
    withCheck?: string
  }[], tableName: string): { issues: string[], recommendations: string[] } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    if (policies.length === 0) {
      issues.push('No RLS policies defined')
      recommendations.push('Create RLS policies for SELECT, INSERT, UPDATE, DELETE operations')
      return { issues, recommendations }
    }
    
    // Check for essential policy types
    const commands = policies.map(p => p.command.toUpperCase())
    const essentialCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    
    for (const command of essentialCommands) {
      if (!commands.includes(command)) {
        issues.push(`Missing ${command} policy`)
        recommendations.push(`Create ${command} policy for ${tableName}`)
      }
    }
    
    // Check for overly permissive policies
    for (const policy of policies) {
      // Check for policies that apply to PUBLIC or don't filter by tenant
      if (policy.role.includes('public') || policy.role.includes('PUBLIC')) {
        issues.push(`Policy "${policy.name}" applies to PUBLIC role`)
        recommendations.push(`Restrict policy "${policy.name}" to authenticated users only`)
      }
      
      // Check if policies include tenant/organization filtering
      if (policy.using && !this.includesTenantFiltering(policy.using)) {
        issues.push(`Policy "${policy.name}" may not filter by tenant/organization`)
        recommendations.push(`Add tenant filtering to policy "${policy.name}"`)
      }
    }
    
    return { issues, recommendations }
  }
  
  /**
   * Check if a policy includes tenant/organization filtering
   */
  private includesTenantFiltering(policyExpression: string): boolean {
    const tenantFilterPatterns = [
      /organization_?id/i,
      /tenant_?id/i,
      /owner_?id/i,
      /user_?id/i,
      /auth\./i, // Supabase auth functions
      /current_setting.*tenant/i
    ]
    
    return tenantFilterPatterns.some(pattern => pattern.test(policyExpression))
  }
  
  /**
   * Convert Prisma model name to PostgreSQL table name
   */
  private convertToPgTableName(modelName: string): string {
    // Convert PascalCase to snake_case and make plural
    // User -> User (Prisma uses User table name as-is)
    // Property -> Property
    // MaintenanceRequest -> MaintenanceRequest
    
    // For now, assume table names match model names
    // In production, this might need more sophisticated mapping
    return modelName
  }
  
  /**
   * Validate database connection and environment
   */
  private async validateDatabaseConnection(): Promise<void> {
    const dbUrl = this.config.get<string>('DATABASE_URL')
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL not configured')
    }
    
    // Check if we're connected to production database
    const isProduction = dbUrl.includes('production') || dbUrl.includes('prod') || dbUrl.includes('live')
    
    if (isProduction) {
      this.logger.warn('🚨 Running RLS validation against PRODUCTION database')
    } else {
      this.logger.log('🧪 Running RLS validation against development/test database')
    }
    
    // Test basic connection
    try {
      await this.prisma.$queryRaw`SELECT 1 as test`
    } catch (error) {
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Log security report summary
   */
  private logSecurityReport(report: RLSSecurityReport): void {
    const statusEmoji = {
      SECURE: '✅',
      NEEDS_ATTENTION: '⚠️',
      VULNERABLE: '🚨'
    }
    
    this.logger.log('\n🔒 RLS SECURITY VALIDATION REPORT')
    this.logger.log('=====================================')
    this.logger.log(`${statusEmoji[report.overallSecurity]} Overall Security: ${report.overallSecurity}`)
    this.logger.log(`📊 Tables Analyzed: ${report.totalTables}`)
    this.logger.log(`✅ Secure: ${report.secureTablesCount}`)
    this.logger.log(`⚠️ Warnings: ${report.warningTablesCount}`)
    this.logger.log(`🚨 Vulnerable: ${report.vulnerableTablesCount}`)
    
    if (report.criticalIssues.length > 0) {
      this.logger.log('\n🚨 CRITICAL ISSUES:')
      report.criticalIssues.forEach(issue => this.logger.log(`  • ${issue}`))
    }
    
    if (report.recommendations.length > 0) {
      this.logger.log('\n💡 RECOMMENDATIONS:')
      report.recommendations.slice(0, 5).forEach(rec => this.logger.log(`  • ${rec}`))
    }
  }
}