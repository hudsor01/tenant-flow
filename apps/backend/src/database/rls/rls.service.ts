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

		// Use the efficient batch RPC function for better performance
		const { data, error } = await this.getSupabaseClient().rpc(
			'check_tables_rls',
			{ table_names: criticalTables }
		)

		if (error) {
			throw new Error(`Failed to audit RLS status: ${error.message}`)
		}

		const tableResults =
			(data as {
				tablename: string
				rowsecurity: boolean
				exists: boolean
			}[]) || []

		// Create a map for quick lookup
		const tableMap = new Map(tableResults.map(t => [t.tablename, t]))

		// Process each critical table
		const results = await Promise.all(
			criticalTables.map(async table => {
				const tableInfo = tableMap.get(table)

				if (!tableInfo || !tableInfo.exists) {
					return {
						table,
						enabled: false,
						policyCount: 0,
						policyNames: [],
						lastAudit: new Date()
					}
				}

				const enabled = Boolean(tableInfo.rowsecurity)
				const policies = enabled
					? await this.getTablePolicies(table)
					: []

				return {
					table,
					enabled,
					policyCount: policies.length,
					policyNames: policies.map(p => p.policyname),
					lastAudit: new Date()
				}
			})
		)

		return results
	}

	/**
	 * Get all policies for a specific table
	 */
	async getTablePolicies(tableName: string): Promise<RLSPolicy[]> {
		const { data, error } = await this.getSupabaseClient().rpc(
			'get_policies_for_table',
			{ table_name: tableName }
		)

		if (error) {
			throw new Error(
				`Failed to get policies for ${tableName}: ${error.message}`
			)
		}

		// Parse the JSON response properly
		const policies = Array.isArray(data)
			? data
			: typeof data === 'string'
				? JSON.parse(data)
				: []

		return policies.map((p: Record<string, unknown>) => ({
			policyname: p.policyname,
			permissive: p.permissive,
			roles: p.roles,
			cmd: p.cmd,
			qual: p.qual,
			with_check: p.with_check
		})) as RLSPolicy[]
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
