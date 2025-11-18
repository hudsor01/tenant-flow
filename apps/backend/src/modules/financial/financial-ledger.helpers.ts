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

export interface LedgerData {
	rentPayments: RentPaymentRow[]
	expenses: ExpenseRow[]
	leases: LeaseRow[]
	maintenanceRequests: MaintenanceRequestRow[]
	units: UnitRow[]
	properties: PropertyRow[]
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

export async function loadLedgerData(
	client: SupabaseClient<Database>
): Promise<LedgerData> {
	const [
		rentPaymentsResult,
		expensesResult,
		leasesResult,
		maintenanceResult,
		unitsResult,
		propertiesResult
	] = await Promise.all([
		client.from('rent_payments').select('*'),
		client.from('expenses').select('*'),
		client.from('leases').select('*'),
		client.from('maintenance_requests').select('*'),
		client.from('units').select('*'),
		client.from('properties').select('*')
	])

	const errors = [
		rentPaymentsResult.error && `rent_payments: ${rentPaymentsResult.error.message}`,
		expensesResult.error && `expenses: ${expensesResult.error.message}`,
		leasesResult.error && `leases: ${leasesResult.error.message}`,
		maintenanceResult.error && `maintenance_requests: ${maintenanceResult.error.message}`,
		unitsResult.error && `units: ${unitsResult.error.message}`,
		propertiesResult.error && `properties: ${propertiesResult.error.message}`
	].filter(Boolean)

	if (errors.length) {
		throw new Error(`Failed to load ledger data - ${errors.join('; ')}`)
	}

	return {
		rentPayments: rentPaymentsResult.data ?? [],
		expenses: expensesResult.data ?? [],
		leases: leasesResult.data ?? [],
		maintenanceRequests: maintenanceResult.data ?? [],
		units: unitsResult.data ?? [],
		properties: propertiesResult.data ?? []
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

export function buildUnitPropertyMap(units: UnitRow[]): Map<string, string> {
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
	}, new Map<string, MaintenanceRequestRow>())

	const revenue = new Map<string, number>()
	for (const payment of ledger.rentPayments) {
		if (
			(payment.status !== 'PAID' && !payment.paid_date) ||
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
