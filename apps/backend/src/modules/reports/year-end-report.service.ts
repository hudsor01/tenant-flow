import { Injectable } from '@nestjs/common'
import type { YearEndSummary, Year1099Summary } from '@repo/shared/types/reports'
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { PDFGeneratorService } from '../pdf/pdf-generator.service'
import { TaxDocumentsService } from '../financial/tax-documents.service'
import { loadPropertyIdsByOwner } from './reports.utils'

@Injectable()
export class YearEndReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService,
		private readonly pdfGeneratorService: PDFGeneratorService,
		private readonly taxDocumentsService: TaxDocumentsService
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

	/**
	 * Generate a year-end summary PDF for download.
	 * Uses Puppeteer to render an HTML template to PDF.
	 */
	async generateYearEndPdf(userId: string, year: number): Promise<Buffer> {
		const summary = await this.getYearEndSummary(userId, year)
		const html = this.buildYearEndHtml(summary)
		return this.pdfGeneratorService.generatePDF(html, {
			format: 'A4',
			margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
		})
	}

	/**
	 * Generate tax documents PDF for download.
	 * Uses Puppeteer to render an HTML template to PDF.
	 */
	async generateTaxDocumentPdf(
		token: string,
		userId: string,
		taxYear: number
	): Promise<Buffer> {
		const taxData = await this.taxDocumentsService.generateTaxDocuments(
			token,
			userId,
			taxYear
		)
		const html = this.buildTaxDocumentHtml(taxData)
		return this.pdfGeneratorService.generatePDF(html, {
			format: 'A4',
			margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
		})
	}

	private buildYearEndHtml(summary: YearEndSummary): string {
		const fmt = (n: number) =>
			n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-family: monospace; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .header { margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
    .summary-card h3 { margin: 0 0 4px; font-size: 11px; color: #666; }
    .summary-card p { margin: 0; font-size: 18px; font-weight: bold; }
    .disclaimer { font-size: 10px; color: #888; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Year-End Financial Summary ${summary.year}</h1>
    <p style="color:#666">Prepared by TenantFlow</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>Gross Rental Income</h3>
      <p>$${fmt(summary.grossRentalIncome)}</p>
    </div>
    <div class="summary-card">
      <h3>Operating Expenses</h3>
      <p>$${fmt(summary.operatingExpenses)}</p>
    </div>
    <div class="summary-card">
      <h3>Net Income</h3>
      <p>$${fmt(summary.netIncome)}</p>
    </div>
  </div>

  <h2>Income by Property</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th class="amount">Income</th>
        <th class="amount">Expenses</th>
        <th class="amount">Net Income</th>
      </tr>
    </thead>
    <tbody>
      ${summary.byProperty.map(p => `
        <tr>
          <td>${p.propertyName}</td>
          <td class="amount">$${fmt(p.income)}</td>
          <td class="amount">$${fmt(p.expenses)}</td>
          <td class="amount">$${fmt(p.netIncome)}</td>
        </tr>
      `).join('')}
      <tr class="total">
        <td>Total</td>
        <td class="amount">$${fmt(summary.grossRentalIncome)}</td>
        <td class="amount">$${fmt(summary.operatingExpenses)}</td>
        <td class="amount">$${fmt(summary.netIncome)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Expenses by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${summary.expenseByCategory.map(e => `
        <tr>
          <td>${e.category}</td>
          <td class="amount">$${fmt(e.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="disclaimer">
    Generated by TenantFlow. Consult a Certified Public Accountant (CPA) before filing your tax return.
  </div>
</body>
</html>`
	}

	private buildTaxDocumentHtml(taxData: TaxDocumentsData): string {
		const fmt = (n: number) =>
			n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

		return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-family: monospace; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .header { margin-bottom: 24px; }
    .disclaimer { font-size: 10px; color: #888; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tax Documents — ${taxData.taxYear}</h1>
    <p style="color:#666">Period: ${taxData.period.label} | Prepared by TenantFlow</p>
    <p style="color:#888;font-size:10px">This document is provided for informational purposes. Consult a tax professional before filing.</p>
  </div>

  <h2>Schedule E Summary</h2>
  <table>
    <tbody>
      <tr><td>Gross Rental Income</td><td class="amount">$${fmt(taxData.schedule.scheduleE.grossRentalIncome)}</td></tr>
      <tr><td>Total Expenses</td><td class="amount">($${fmt(taxData.schedule.scheduleE.totalExpenses)})</td></tr>
      <tr><td>Depreciation</td><td class="amount">($${fmt(taxData.schedule.scheduleE.depreciation)})</td></tr>
      <tr class="total"><td>Net Income (Loss)</td><td class="amount">$${fmt(taxData.schedule.scheduleE.netIncome)}</td></tr>
    </tbody>
  </table>

  <h2>Expense Categories</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="amount">Amount</th>
        <th class="amount">% of Total</th>
        <th>Deductible</th>
      </tr>
    </thead>
    <tbody>
      ${taxData.expenseCategories.map(cat => `
        <tr>
          <td>${cat.category}</td>
          <td class="amount">$${fmt(cat.amount)}</td>
          <td class="amount">${cat.percentage.toFixed(1)}%</td>
          <td>${cat.deductible ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Property Depreciation (Schedule E)</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th class="amount">Cost Basis</th>
        <th class="amount">Annual Depreciation</th>
        <th class="amount">Accumulated</th>
        <th class="amount">Remaining Basis</th>
      </tr>
    </thead>
    <tbody>
      ${taxData.propertyDepreciation.map(p => `
        <tr>
          <td>${p.propertyName}</td>
          <td class="amount">$${fmt(p.propertyValue)}</td>
          <td class="amount">$${fmt(p.annualDepreciation)}</td>
          <td class="amount">$${fmt(p.accumulatedDepreciation)}</td>
          <td class="amount">$${fmt(p.remainingBasis)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="disclaimer">
    Generated by TenantFlow. This is not tax advice. Consult a Certified Public Accountant (CPA) before filing your tax return.
    Depreciation calculated at residential rate (27.5 years straight-line).
  </div>
</body>
</html>`
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
