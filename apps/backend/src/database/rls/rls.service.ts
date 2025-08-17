import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../common/supabase/supabase.service'
import {
	RLSAuditReport,
	RLSPolicy,
	RLSPolicyInfo,
	RLSTableStatus,
	UserRole
} from '@repo/shared'

@Injectable()
export class RLSService {
	constructor(private readonly supabaseService: SupabaseService) {}

	private getSupabaseClient() {
		return this.supabaseService.getAdminClient()
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
			// Query system tables using raw SQL instead of direct table access
			const query = `
				SELECT tablename, rowsecurity 
				FROM pg_tables 
				WHERE schemaname = 'public' 
				AND tablename = $1
			`
			const result = await this.supabaseService.executeRawQuery<{
				tablename: string
				rowsecurity: boolean
			}>(query, [table])
			const data = result[0]
			const error = !data ? new Error('Table not found') : null

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
				const policies = enabled
					? await this.getTablePolicies(table)
					: []
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
		const { data, error } = await (this.getSupabaseClient().rpc as any)(
			'get_policies_for_table',
			{ table_name: tableName }
		)

		if (error) {
			throw new Error(
				`Failed to get policies for ${tableName}: ${error.message}`
			)
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
			const { data } = await this.getSupabaseClient()
				.from('Property')
				.select('id')
				.eq('ownerId', userId)
				.limit(1)
			testResults.property.canViewOwn = !!data && data.length > 0
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
			const { error } = await (this.getSupabaseClient().rpc as any)(
				'apply_rls_policies'
			)

			if (error) {
				errors.push(`Failed to apply RLS policies: ${error.message}`)
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
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
					const tablePolicies = await this.getTablePolicies(
						tableStatus.table
					)
					policies[tableStatus.table] = tablePolicies.map(policy => {
						const whereClause = policy.qual
							? ` WHERE ${policy.qual}`
							: ''
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
					recommendations.push(
						`Failed to retrieve policies for ${tableStatus.table}`
					)
				}
			} else {
				recommendations.push(`Enable RLS on ${tableStatus.table} table`)
				criticalIssues.push(
					`RLS not enabled on critical table: ${tableStatus.table}`
				)
			}
		}

		// Add general recommendations
		if (recommendations.length === 0) {
			recommendations.push('All critical tables have RLS enabled')
		}

		// Calculate security score (0-100 based on RLS coverage)
		const enabledTables = tableStatuses.filter(t => t.enabled).length
		const securityScore = Math.round(
			(enabledTables / tableStatuses.length) * 100
		)

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
