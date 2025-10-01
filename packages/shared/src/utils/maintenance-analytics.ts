import type {
	MaintenanceAnalyticsPageResponse,
	MaintenanceCategoryBreakdown,
	MaintenanceCostBreakdownEntry,
	MaintenanceMetricSummary,
	MaintenanceTrendPoint
} from '../types/maintenance-analytics.js'

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

export function mapMaintenanceMetrics(data: unknown): MaintenanceMetricSummary {
	if (!isObject(data)) {
		return {
			openRequests: 0,
			inProgressRequests: 0,
			completedRequests: 0,
			averageResponseTimeHours: 0,
			totalCost: 0
		}
	}

	return {
		openRequests: toNumber(
			data.open_requests ?? data.openRequests ?? data.open
		),
		inProgressRequests: toNumber(
			data.in_progress_requests ?? data.inProgressRequests ?? data.inProgress
		),
		completedRequests: toNumber(
			data.completed_requests ?? data.completedRequests ?? data.completed
		),
		averageResponseTimeHours: toNumber(
			data.average_response_time_hours ??
				data.averageResponseTimeHours ??
				data.avg_response_time ??
				0
		),
		totalCost: toNumber(data.total_cost ?? data.totalCost)
	}
}

export function mapMaintenanceCostBreakdown(
	data: unknown
): MaintenanceCostBreakdownEntry[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			category: toString(record.category ?? record.label ?? 'Other'),
			amount: toNumber(record.amount ?? record.value),
			percentage: toNumber(record.percentage ?? record.percent)
		}
	})
}

export function mapMaintenanceTrends(data: unknown): MaintenanceTrendPoint[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			period: toString(record.period ?? record.month ?? record.date ?? ''),
			completed: toNumber(record.completed ?? record.done),
			pending: toNumber(record.pending ?? record.open),
			avgResolutionTime: toNumber(
				record.avg_resolution_time ?? record.averageResolutionTime ?? 0
			)
		}
	})
}

export function mapMaintenanceCategoryBreakdown(
	data: unknown
): MaintenanceCategoryBreakdown[] {
	if (!Array.isArray(data)) {
		return []
	}

	return data.map(item => {
		const record = isObject(item) ? item : {}
		return {
			category: toString(record.category ?? record.label ?? 'Other'),
			count: toNumber(record.count ?? record.total)
		}
	})
}

export function buildMaintenanceAnalyticsPageResponse(raw: {
	metrics?: unknown
	costBreakdown?: unknown
	trends?: unknown
	categoryBreakdown?: unknown
}): MaintenanceAnalyticsPageResponse {
	return {
		metrics: mapMaintenanceMetrics(raw.metrics),
		costBreakdown: mapMaintenanceCostBreakdown(raw.costBreakdown),
		trends: mapMaintenanceTrends(raw.trends),
		categoryBreakdown: mapMaintenanceCategoryBreakdown(raw.categoryBreakdown)
	}
}
