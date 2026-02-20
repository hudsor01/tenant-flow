import { Injectable } from '@nestjs/common'
import type { YearEndSummary, Year1099Summary } from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { loadPropertyIdsByOwner } from './reports.utils'

@Injectable()
export class YearEndReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	async getYearEndSummary(userId: string, year: number): Promise<YearEndSummary> {
		const startDate = `${year}-01-01T00:00:00.000Z`
		const endDate = `${year}-12-31T23:59:59.999Z`

		const propertyIds = await loadPropertyIdsByOwner(
			this.supabase,
			this.logger,
			userId
		)

		if (propertyIds.length === 0) {
			return {
				year,
				grossRentalIncome: 0,
				operatingExpenses: 0,
				netIncome: 0,
				byProperty: [],
				expenseByCategory: [],
			}
		}

		const { data: properties } = await this.supabase
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', propertyIds)

		const { data: payments } = await this.supabase
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				amount, status,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.eq('status', 'succeeded')
			.in('lease.unit.property_id', propertyIds)
			.gte('created_at', startDate)
			.lte('created_at', endDate)

		const { data: maintenance } = await this.supabase
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				actual_cost, estimated_cost,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', propertyIds)
			.gte('created_at', startDate)
			.lte('created_at', endDate)

		const { data: expenses } = await this.supabase
			.getAdminClient()
			.from('expenses')
			.select(
				`
				amount, vendor_name,
				maintenance_requests!expenses_maintenance_request_id_fkey(
					units!maintenance_requests_unit_id_fkey(property_id)
				)
			`
			)
			.in('maintenance_requests.units.property_id', propertyIds)
			.gte('expense_date', `${year}-01-01`)
			.lte('expense_date', `${year}-12-31`)

		const incomeByProperty = new Map<string, number>()
		const expensesByProperty = new Map<string, number>()
		const expenseByCategoryMap = new Map<string, number>()

		let grossRentalIncome = 0
		let operatingExpenses = 0

		for (const payment of payments ?? []) {
			const amount = (payment.amount ?? 0) / 100
			grossRentalIncome += amount
			type PaymentLease = { unit?: { property_id?: string } | null }
			const propertyId = (payment.lease as PaymentLease)?.unit?.property_id
			if (propertyId) {
				incomeByProperty.set(
					propertyId,
					(incomeByProperty.get(propertyId) ?? 0) + amount
				)
			}
		}

		for (const request of maintenance ?? []) {
			const cost = ((request.actual_cost ?? request.estimated_cost ?? 0) as number) / 100
			operatingExpenses += cost
			type MaintenanceUnit = { property_id?: string } | null
			const propertyId = (request.unit as MaintenanceUnit)?.property_id
			if (propertyId) {
				expensesByProperty.set(
					propertyId,
					(expensesByProperty.get(propertyId) ?? 0) + cost
				)
			}
			expenseByCategoryMap.set(
				'Maintenance',
				(expenseByCategoryMap.get('Maintenance') ?? 0) + cost
			)
		}

		for (const expense of expenses ?? []) {
			const amount = (expense.amount ?? 0) / 100
			operatingExpenses += amount
			type ExpenseMR = { units?: { property_id?: string } | null }
			const propertyId = (
				expense.maintenance_requests as ExpenseMR
			)?.units?.property_id
			if (propertyId) {
				expensesByProperty.set(
					propertyId,
					(expensesByProperty.get(propertyId) ?? 0) + amount
				)
			}
			const category = expense.vendor_name
				? `Vendor: ${expense.vendor_name}`
				: 'Other Expenses'
			expenseByCategoryMap.set(
				category,
				(expenseByCategoryMap.get(category) ?? 0) + amount
			)
		}

		const propertyNameMap = new Map((properties ?? []).map(p => [p.id, p.name]))

		const byProperty = propertyIds.map(id => {
			const income = incomeByProperty.get(id) ?? 0
			const expenses = expensesByProperty.get(id) ?? 0
			return {
				propertyId: id,
				propertyName: propertyNameMap.get(id) ?? 'Unknown',
				income,
				expenses,
				netIncome: income - expenses,
			}
		})

		return {
			year,
			grossRentalIncome,
			operatingExpenses,
			netIncome: grossRentalIncome - operatingExpenses,
			byProperty,
			expenseByCategory: Array.from(expenseByCategoryMap.entries()).map(
				([category, amount]) => ({ category, amount })
			),
		}
	}

	async get1099Vendors(userId: string, year: number): Promise<Year1099Summary> {
		const propertyIds = await loadPropertyIdsByOwner(
			this.supabase,
			this.logger,
			userId
		)

		if (propertyIds.length === 0) {
			return { year, threshold: 600, recipients: [], totalReported: 0 }
		}

		const { data: expenses } = await this.supabase
			.getAdminClient()
			.from('expenses')
			.select(
				`
				amount, vendor_name,
				maintenance_requests!expenses_maintenance_request_id_fkey(
					units!maintenance_requests_unit_id_fkey(property_id)
				)
			`
			)
			.in('maintenance_requests.units.property_id', propertyIds)
			.gte('expense_date', `${year}-01-01`)
			.lte('expense_date', `${year}-12-31`)

		const byVendor = new Map<string, { totalPaid: number; jobCount: number }>()

		for (const expense of expenses ?? []) {
			const vendorName = expense.vendor_name ?? 'Unknown'
			const amount = (expense.amount ?? 0) / 100
			const existing = byVendor.get(vendorName) ?? {
				totalPaid: 0,
				jobCount: 0,
			}
			existing.totalPaid = parseFloat((existing.totalPaid + amount).toFixed(2))
			existing.jobCount += 1
			byVendor.set(vendorName, existing)
		}

		const THRESHOLD = 600
		const recipients = Array.from(byVendor.entries())
			.filter(([, data]) => data.totalPaid >= THRESHOLD)
			.map(([vendorName, data]) => ({
				vendorName,
				totalPaid: data.totalPaid,
				jobCount: data.jobCount,
			}))
			.sort((a, b) => b.totalPaid - a.totalPaid)

		return {
			year,
			threshold: THRESHOLD,
			recipients,
			totalReported: parseFloat(
				recipients.reduce((sum, r) => sum + r.totalPaid, 0).toFixed(2)
			),
		}
	}

	formatYearEndForCsv(summary: YearEndSummary): Record<string, unknown>[] {
		const overviewRows = [
			{ section: 'Overview', item: 'Tax Year', value: summary.year },
			{
				section: 'Overview',
				item: 'Gross Rental Income',
				value: summary.grossRentalIncome.toFixed(2),
			},
			{
				section: 'Overview',
				item: 'Operating Expenses',
				value: summary.operatingExpenses.toFixed(2),
			},
			{
				section: 'Overview',
				item: 'Net Income',
				value: summary.netIncome.toFixed(2),
			},
		]

		const propertyRows = summary.byProperty.map(p => ({
			section: 'By Property',
			item: p.propertyName,
			income: p.income.toFixed(2),
			expenses: p.expenses.toFixed(2),
			net: p.netIncome.toFixed(2),
		}))

		const categoryRows = summary.expenseByCategory.map(c => ({
			section: 'Expense Categories',
			item: c.category,
			amount: c.amount.toFixed(2),
		}))

		return [...overviewRows, ...propertyRows, ...categoryRows]
	}

	format1099ForCsv(summary: Year1099Summary): Record<string, unknown>[] {
		if (summary.recipients.length === 0) {
			return [
				{
					message: `No vendors met the $${summary.threshold} 1099-NEC threshold for ${summary.year}`,
				},
			]
		}

		return summary.recipients.map(r => ({
			vendor_name: r.vendorName,
			total_paid: r.totalPaid.toFixed(2),
			job_count: r.jobCount,
			year: summary.year,
			threshold: summary.threshold,
			requires_1099: 'Yes',
		}))
	}
}
