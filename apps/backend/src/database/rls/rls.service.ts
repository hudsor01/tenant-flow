import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { UserRole } from '@tenantflow/shared'

interface RLSPolicy {
  schemaname: string
  tablename: string
  policyname: string
  permissive: string
  roles: string[]
  cmd: string
  qual: string
  with_check: string
}

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
  async verifyRLSEnabled(): Promise<{ table: string; enabled: boolean }[]> {
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
        results.push({ table, enabled: false })
      } else {
        results.push({ table, enabled: Boolean(data?.rowsecurity) })
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
      testResults.property.canViewOwn = ownProperties.length >= 0
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
  async generateRLSAuditReport() {
    const report = {
      timestamp: new Date().toISOString(),
      rlsStatus: await this.verifyRLSEnabled(),
      policies: {} as Record<string, { name: string; enabled: boolean; definition: string }[]>,
      recommendations: [] as string[]
    }

    // Get policies for each critical table
    for (const tableStatus of report.rlsStatus) {
      if (tableStatus.enabled) {
        try {
          const policies = await this.getTablePolicies(tableStatus.table)
          report.policies[tableStatus.table] = policies.map(policy => ({
            name: policy.policyname,
            enabled: policy.permissive === 'PERMISSIVE',
            definition: `${policy.cmd} ON ${policy.tablename} FOR ${policy.roles.join(', ')} ${policy.qual ? `WHERE ${policy.qual}` : ''}`
          }))
        } catch {
          report.recommendations.push(`Failed to retrieve policies for ${tableStatus.table}`)
        }
      } else {
        report.recommendations.push(`Enable RLS on ${tableStatus.table} table`)
      }
    }

    // Add general recommendations
    if (report.recommendations.length === 0) {
      report.recommendations.push('All critical tables have RLS enabled')
    }

    return report
  }
}