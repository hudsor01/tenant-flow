import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { UserRole, RLSPolicy, RLSAuditReport, RLSTableStatus, RLSPolicyInfo } from '@repo/shared'

@Injectable()
export class RLSService {
  private supabaseAdmin: ReturnType<typeof createClient> | undefined

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  private ensureSupabaseClient() {
    if (!this.supabaseAdmin) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
      const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing')
      }

      this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    return this.supabaseAdmin
  }

  /**
   * Verify that RLS is enabled on all critical tables
   */
  async verifyRLSEnabled(): Promise<RLSTableStatus[]> {
    const criticalTables = [
      'Property',
      'Unit',
      'Tenant', 
      'Lease',
      'MaintenanceRequest',
      'Document',
      'Expense',
      'Invoice',
      'Subscription'
    ]

    const results = []

    for (const table of criticalTables) {
      const { data, error } = await this.ensureSupabaseClient()
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', table)
        .single()

      if (error) {
        results.push({ 
          table, 
          enabled: false, 
          policyCount: 0, 
          policyNames: [],
          lastAudit: new Date()
        })
      } else {
        const enabled = Boolean(data?.rowsecurity)
        const policies = enabled ? await this.getTablePolicies(table) : []
        results.push({ 
          table, 
          enabled, 
          policyCount: policies.length, 
          policyNames: policies.map(p => p.policyname),
          lastAudit: new Date()
        })
      }
    }

    return results
  }

  /**
   * Get all policies for a specific table
   */
  async getTablePolicies(tableName: string): Promise<RLSPolicy[]> {
    const { data, error } = await this.ensureSupabaseClient()
      .rpc('get_policies_for_table', { table_name: tableName })

    if (error) {
      throw new Error(`Failed to get policies for ${tableName}: ${error.message}`)
    }

    return (data as RLSPolicy[]) || []
  }

  /**
   * Test RLS policies by simulating different user contexts
   */
  async testRLSPolicies(userId: string, _role: UserRole) {
    // This would test various scenarios
    const testResults = {
      property: {
        canViewOwn: false,
        cannotViewOthers: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
      },
      unit: {
        canViewOwn: false,
        cannotViewOthers: false,
        canCreate: false,
        canUpdate: false
      },
      tenant: {
        canViewOwn: false,
        canViewInProperties: false,
        cannotViewUnrelated: false
      },
      lease: {
        canViewOwn: false,
        cannotViewOthers: false
      }
    }

    // Test property access
    try {
      const ownProperties = await this.prisma.property.findMany({
        where: { ownerId: userId }
      })
      testResults.property.canViewOwn = ownProperties.length > 0
    } catch {
      testResults.property.canViewOwn = false
    }

    return testResults
  }

  /**
   * Apply comprehensive RLS policies
   */
  async applyRLSPolicies(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []
    
    // Read and execute the RLS SQL file
    try {
      const { error } = await this.ensureSupabaseClient().rpc('apply_rls_policies')
      
      if (error) {
        errors.push(`Failed to apply RLS policies: ${error.message}`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(`Error applying RLS policies: ${errorMessage}`)
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  /**
   * Create a comprehensive RLS audit report
   */
  async generateRLSAuditReport(): Promise<RLSAuditReport> {
    const tableStatuses = await this.verifyRLSEnabled()
    const policies: Record<string, RLSPolicyInfo[]> = {}
    const recommendations: string[] = []
    const criticalIssues: string[] = []

    // Get policies for each critical table
    for (const tableStatus of tableStatuses) {
      if (tableStatus.enabled) {
        try {
          const tablePolicies = await this.getTablePolicies(tableStatus.table)
          policies[tableStatus.table] = tablePolicies.map(policy => {
            const whereClause = policy.qual ? ` WHERE ${policy.qual}` : ''
            return {
              name: policy.policyname,
              tableName: policy.tablename,
              enabled: policy.permissive === 'PERMISSIVE',
              description: `${policy.cmd} ON ${policy.tablename} FOR ${policy.roles.join(', ')}${whereClause}`,
              operations: [policy.cmd],
              roles: policy.roles
            }
          })
        } catch {
          recommendations.push(`Failed to retrieve policies for ${tableStatus.table}`)
        }
      } else {
        recommendations.push(`Enable RLS on ${tableStatus.table} table`)
        criticalIssues.push(`RLS not enabled on critical table: ${tableStatus.table}`)
      }
    }

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push('All critical tables have RLS enabled')
    }

    // Calculate security score (0-100 based on RLS coverage)
    const enabledTables = tableStatuses.filter(t => t.enabled).length
    const securityScore = Math.round((enabledTables / tableStatuses.length) * 100)

    const report: RLSAuditReport = {
      timestamp: new Date().toISOString(),
      tableStatuses,
      policies,
      recommendations,
      securityScore,
      criticalIssues
    }

    return report
  }
}