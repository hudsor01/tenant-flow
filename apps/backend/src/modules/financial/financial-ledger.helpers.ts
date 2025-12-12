import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

type TableRow<TableName extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][TableName]['Row']

export type RentPaymentRow = TableRow<'rent_payments'>
export type ExpenseRow = TableRow<'expenses'>
export type LeaseRow = TableRow<'leases'>
export type MaintenanceRequestRow = TableRow<'maintenance_requests'>
export type UnitRow = TableRow<'units'>
export type PropertyRow = TableRow<'properties'>

// Partial types for optimized queries
export type RentPaymentPartial = Pick<RentPaymentRow, 'status' | 'paid_date' | 'due_date' | 'amount' | 'lease_id' | 'application_fee_amount' | 'late_fee_amount'>
export type ExpensePartial = Pick<ExpenseRow, 'expense_date' | 'created_at' | 'amount' | 'maintenance_request_id'>
export type LeasePartial = Pick<LeaseRow, 'id' | 'unit_id' | 'security_deposit'>
export type MaintenanceRequestPartial = Pick<MaintenanceRequestRow, 'id' | 'unit_id' | 'status' | 'completed_at' | 'created_at' | 'actual_cost' | 'estimated_cost'>
export type UnitPartial = Pick<UnitRow, 'id' | 'property_id'>
export type PropertyPartial = Pick<PropertyRow, 'id' | 'name' | 'created_at'>

export interface LedgerData {
	rentPayments: RentPaymentPartial[]
	expenses: ExpensePartial[]
	leases: LeasePartial[]
	maintenanceRequests: MaintenanceRequestPartial[]
	units: UnitPartial[]
	properties: PropertyPartial[]
}

type LedgerAggregationRow = {
	rent_payments: RentPaymentPartial[]
	expenses: ExpensePartial[]
	leases: LeasePartial[]
	maintenance_requests: MaintenanceRequestPartial[]
	units: UnitPartial[]
	properties: PropertyPartial[]
}

export interface DateRange {
	start?: Date
	end?: Date
}

export interface PropertyFinancials {
	revenue: Map<string, number>
	expenses: Map<string, number>
	leasePropertyMap: Map<string, string | null>
	unitPropertyMap: Map<string, string>
}

/**
 * Load all ledger data in a single nested query (was 6 parallel queries).
 * This reduces database round-trips from 6 to 1, improving latency significantly.
 */
export async function loadLedgerData(
	client: SupabaseClient<Database>
): Promise<LedgerData> {
	const { data, error } = await client.rpc('ledger_aggregation')

	if (error) {
		throw new Error(`Failed to load ledger data: ${error.message}`)
	}

	// RPC returns JSON object with all aggregated data
	const row = data as LedgerAggregationRow | null

	return {
		rentPayments: row?.rent_payments ?? [],
		expenses: row?.expenses ?? [],
		leases: row?.leases ?? [],
		maintenanceRequests: row?.maintenance_requests ?? [],
		units: row?.units ?? [],
		properties: row?.properties ?? []
	}
}

export function parseDate(value?: string | null): Date | null {
	if (!value) {
		return null
	}
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isWithinRange(
	value: string | null | undefined,
	range?: DateRange
): boolean {
	if (!range) {
		return true
	}
	const date = parseDate(value)
	if (!date) {
		return false
	}
	if (range.start && date < range.start) {
		return false
	}
	if (range.end && date > range.end) {
		return false
	}
	return true
}

export function buildUnitPropertyMap(units: UnitPartial[]): Map<string, string> {
	return units.reduce((map, unit) => {
		if (unit.id && unit.property_id) {
			map.set(unit.id, unit.property_id)
		}
		return map
	}, new Map<string, string>())
}

export function calculatePropertyFinancials(
	ledger: LedgerData,
	range?: DateRange
): PropertyFinancials {
	const unitPropertyMap = buildUnitPropertyMap(ledger.units)
	const leasePropertyMap = ledger.leases.reduce((map, lease) => {
		if (!lease.id) {
			return map
		}
		map.set(lease.id, unitPropertyMap.get(lease.unit_id) ?? null)
		return map
	}, new Map<string, string | null>())

	const maintenanceMap = ledger.maintenanceRequests.reduce((map, request) => {
		if (request.id) {
			map.set(request.id, request)
		}
		return map
	}, new Map<string, MaintenanceRequestPartial>())

	const revenue = new Map<string, number>()
	for (const payment of ledger.rentPayments) {
		if (
			(payment.status !== 'succeeded' && !payment.paid_date) ||
			(range && !isWithinRange(payment.due_date, range))
		) {
			continue
		}
		const propertyId = leasePropertyMap.get(payment.lease_id)
		if (!propertyId) {
			continue
		}
		revenue.set(propertyId, (revenue.get(propertyId) ?? 0) + (payment.amount ?? 0))
	}

	const expenses = new Map<string, number>()
	for (const expense of ledger.expenses) {
		if (range && !isWithinRange(expense.expense_date ?? expense.created_at, range)) {
			continue
		}
		if (!expense.maintenance_request_id) {
			continue
		}
		const maintenance = maintenanceMap.get(expense.maintenance_request_id)
		if (!maintenance) {
			continue
		}
		const propertyId = unitPropertyMap.get(maintenance.unit_id)
		if (!propertyId) {
			continue
		}
		expenses.set(propertyId, (expenses.get(propertyId) ?? 0) + (expense.amount ?? 0))
	}

	return {
		revenue,
		expenses,
		leasePropertyMap,
		unitPropertyMap
	}
}
