/**
 * Backend RLS Integration Tests: Financial Isolation
 *
 * Validates that financial tables respect tenant boundaries:
 * - Owners can only read their own expenses and maintenance requests
 * - Owners cannot access another owner's financial rows
 * - Tenants cannot access owner-only expense data
 *
 * @group integration
 * @group rls
 * @group security
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import {
	authenticateAs,
	expectEmptyResult,
	expectPermissionError,
	isTestUserAvailable,
	shouldSkipRlsTests,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'

const describeRls = shouldSkipRlsTests ? describe.skip : describe

type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type MaintenanceRequestRow =
	Database['public']['Tables']['maintenance_requests']['Row']

type ExpenseWithOwner = ExpenseRow & {
	maintenance_requests?: Pick<MaintenanceRequestRow, 'owner_user_id'> | null
}

describeRls('RLS: Financial Isolation', () => {
	const testLogger = new Logger('RLSFinancialIsolationTest')
	let ownerA: AuthenticatedTestClient
	let ownerB: AuthenticatedTestClient | null = null
	let tenantA: AuthenticatedTestClient | null = null

	beforeAll(async () => {
		ownerA = await authenticateAs(TEST_USERS.OWNER_A)

		if (isTestUserAvailable('OWNER_B')) {
			try {
				ownerB = await authenticateAs(TEST_USERS.OWNER_B)
			} catch (error) {
				testLogger.warn(
					`[SKIP] Failed to authenticate OWNER_B: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		}

		if (isTestUserAvailable('TENANT_A')) {
			try {
				tenantA = await authenticateAs(TEST_USERS.TENANT_A)
			} catch (error) {
				testLogger.warn(
					`[SKIP] Failed to authenticate TENANT_A: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		}
	})

	describe('Expense Isolation', () => {
		it('owner A can read expenses and sees only their own records', async () => {
			const { data, error } = await ownerA.client
				.from('expenses')
				.select('id, maintenance_requests(owner_user_id)')

			expect(error).toBeNull()
			expect(Array.isArray(data)).toBe(true)

			const rows = (data ?? []) as ExpenseWithOwner[]
			if (rows.length === 0) {
				testLogger.warn('Owner A has no expenses to validate ownership')
				return
			}

			for (const row of rows) {
				expect(row.maintenance_requests?.owner_user_id).toBe(ownerA.user_id)
			}
		})

		it('owner A cannot read owner B expenses', async () => {
			if (!ownerB) {
				testLogger.warn('[SKIP] Owner B not available')
				return
			}

			const { data: ownerBExpense, error: ownerBError } = await ownerB.client
				.from('expenses')
				.select('id')
				.limit(1)
				.maybeSingle()

			if (ownerBError || !ownerBExpense) {
				testLogger.warn('Owner B has no expenses to test cross-tenant access')
				return
			}

			const { data, error } = await ownerA.client
				.from('expenses')
				.select('id')
				.eq('id', ownerBExpense.id)

			if (error) {
				expectPermissionError(error, 'owner A querying owner B expense')
			} else {
				expectEmptyResult(data, 'owner A querying owner B expense')
			}
		})
	})

	describe('Maintenance Request Isolation', () => {
		it('owner A can read maintenance requests and sees only their own records', async () => {
			const { data, error } = await ownerA.client
				.from('maintenance_requests')
				.select('id, owner_user_id')

			expect(error).toBeNull()
			expect(Array.isArray(data)).toBe(true)

			const rows = (data ?? []) as MaintenanceRequestRow[]
			if (rows.length === 0) {
				testLogger.warn('Owner A has no maintenance requests to validate ownership')
				return
			}

			for (const row of rows) {
				expect(row.owner_user_id).toBe(ownerA.user_id)
			}
		})

		it('owner A cannot read owner B maintenance requests', async () => {
			if (!ownerB) {
				testLogger.warn('[SKIP] Owner B not available')
				return
			}

			const { data: ownerBRequest, error: ownerBError } = await ownerB.client
				.from('maintenance_requests')
				.select('id')
				.limit(1)
				.maybeSingle()

			if (ownerBError || !ownerBRequest) {
				testLogger.warn(
					'Owner B has no maintenance requests to test cross-tenant access'
				)
				return
			}

			const { data, error } = await ownerA.client
				.from('maintenance_requests')
				.select('id')
				.eq('id', ownerBRequest.id)

			if (error) {
				expectPermissionError(error, 'owner A querying owner B maintenance request')
			} else {
				expectEmptyResult(data, 'owner A querying owner B maintenance request')
			}
		})
	})

	describe('Tenant Access', () => {
		it('tenant cannot read expenses', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] Tenant A not available')
				return
			}

			const { data, error } = await tenantA.client
				.from('expenses')
				.select('id')
				.limit(1)

			if (error) {
				expectPermissionError(error, 'tenant querying expenses')
			} else {
				expectEmptyResult(data, 'tenant querying expenses')
			}
		})
	})
})
