import type {
	LeaseFinancialInsight,
	LeaseFinancialSummary
} from '../types/financial-analytics.js'
import type {
	LeaseAnalyticsPageResponse,
	LeaseLifecyclePoint,
	LeaseStatusBreakdown
} from '../types/lease-analytics.js'

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}

	return fallback
}

function toString(value: unknown, fallback = ''): string {
	if (typeof value === 'string') {
		return value
	}
	if (typeof value === 'number') {
		return value.toString()
	}
	return fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function mapLeaseSummary(data: unknown): LeaseFinancialSummary {
	if (!isObject(data)) {
		return {
			totalLeases: 0,
			activeLeases: 0,
			expiringSoon: 0,
			totalMonthlyRent: 0,
			averageLeaseValue: 0
		}
	}

	return {
		totalLeases: toNumber(data.total_leases ?? data.totalLeases),
		activeLeases: toNumber(data.active_leases ?? data.activeLeases),
		expiringSoon: toNumber(data.expiring_soon ?? data.expiringSoon),
		totalMonthlyRent: toNumber(
			data.total_monthly_rent ?? data.totalMonthlyRent
		),
		averageLeaseValue: toNumber(
			data.average_lease_value ?? data.averageLeaseValue
		)
	}
}

export function mapLeaseProfitability(data: unknown): LeaseFinancialInsight[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			leaseId: toString(
				record.lease_id ?? record.leaseId ?? toString(record.id ?? 'lease')
			),
			propertyName: toString(
				record.property_name ?? record.propertyName ?? 'Unknown Property'
			),
			tenantName: toString(
				record.tenant_name ?? record.tenantName ?? 'Unknown Tenant'
			),
			monthlyRent: toNumber(
				record.monthly_rent ?? record.rent ?? record.amount
			),
			outstandingBalance: toNumber(
				record.outstanding_balance ?? record.balance
			),
			profitabilityScore:
				record.profitability_score === null
					? null
					: toNumber(record.profitability_score ?? record.score)
		}
	})
}

export function mapLeaseLifecycle(data: unknown): LeaseLifecyclePoint[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			period: toString(record.period ?? record.month ?? record.date ?? ''),
			renewals: toNumber(record.renewals ?? record.renewed),
			expirations: toNumber(record.expirations ?? record.expired),
			noticesGiven: toNumber(record.notices ?? record.notices_given)
		}
	})
}

export function mapLeaseStatusBreakdown(data: unknown): LeaseStatusBreakdown[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			status: toString(record.status ?? record.label ?? 'unknown'),
			count: toNumber(record.count ?? record.total),
			percentage: toNumber(record.percentage ?? record.percent)
		}
	})
}

export function buildLeaseAnalyticsPageResponse(raw: {
	summary?: unknown
	profitability?: unknown
	lifecycle?: unknown
	statusBreakdown?: unknown
}): LeaseAnalyticsPageResponse {
	return {
		metrics: mapLeaseSummary(raw.summary),
		profitability: mapLeaseProfitability(raw.profitability),
		lifecycle: mapLeaseLifecycle(raw.lifecycle),
		statusBreakdown: mapLeaseStatusBreakdown(raw.statusBreakdown)
	}
}
