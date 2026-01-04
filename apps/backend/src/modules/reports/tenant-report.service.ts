import { Injectable } from '@nestjs/common'
import type { TenantReport } from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMonthBuckets,
	loadPropertyIdsByOwner,
	parseDateRange
} from './reports.utils'

@Injectable()
export class TenantReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	private get sb(): SupabaseService {
		return this.supabase
	}

	private getEmptyTenantReport(): TenantReport {
		return {
			summary: {
				totalTenants: 0,
				activeLeases: 0,
				leasesExpiringNext90: 0,
				turnoverRate: 0,
				onTimePaymentRate: 0
			},
			paymentHistory: [],
			leaseExpirations: [],
			turnover: []
		}
	}

	/**
	 * Tenant report data: payment history, expirations, turnover
	 */
	async getTenantReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<TenantReport> {
		const { start, end } = parseDateRange(start_date, end_date)
		const property_ids = await loadPropertyIdsByOwner(
			this.sb,
			this.logger,
			user_id
		)

		if (property_ids.length === 0) {
			return this.getEmptyTenantReport()
		}

		const monthBuckets = buildMonthBuckets(start, end)

		const { data: units } = await this.sb
			.getAdminClient()
			.from('units')
			.select('id, property_id, unit_number')
			.in('property_id', property_ids)

		// Get unit_ids for properties first
		const unitIds = units?.map(u => u.id) ?? []
		const { data: leases } = await this.sb
			.getAdminClient()
			.from('leases')
			.select(
				'id, start_date, end_date, unit_id, lease_status, primary_tenant_id, unit:units!leases_unit_id_fkey(property_id)'
			)
			.in('unit_id', unitIds)

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const { data: payments } = await this.sb
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				id,
				created_at,
				due_date,
				paid_date,
				status,
				amount,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.in('lease.unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const paymentSummary = new Map<string, { total: number; onTime: number }>()
		;(payments ?? []).forEach(payment => {
			const monthKey = payment.created_at?.substring(0, 7)
			if (!monthKey || !monthBuckets.has(monthKey)) return
			const entry = paymentSummary.get(monthKey) ?? { total: 0, onTime: 0 }
			entry.total += 1
			if (
				payment.status === 'succeeded' &&
				payment.paid_date &&
				payment.paid_date <= payment.due_date
			) {
				entry.onTime += 1
			}
			paymentSummary.set(monthKey, entry)
		})

		const paymentHistory = Array.from(monthBuckets.keys()).map(month => {
			const entry = paymentSummary.get(month) ?? { total: 0, onTime: 0 }
			const onTimeRate = entry.total ? (entry.onTime / entry.total) * 100 : 0
			return {
				month,
				paymentsReceived: entry.total,
				onTimeRate
			}
		})

		const unitMap = new Map<string, { propertyId: string; unitLabel: string }>()
		;(units ?? []).forEach(unit => {
			unitMap.set(unit.id, {
				propertyId: unit.property_id,
				unitLabel: unit.unit_number ? `Unit ${unit.unit_number}` : 'Unit'
			})
		})

		const propertyMap = new Map<string, string>()
		;(properties ?? []).forEach(property => {
			propertyMap.set(property.id, property.name)
		})

		const now = new Date()
		const ninetyDays = new Date(now)
		ninetyDays.setDate(ninetyDays.getDate() + 90)

		type LeaseWithUnitProp = {
			id: string
			start_date: string | null
			end_date: string
			unit_id: string
			lease_status: string | null
			primary_tenant_id: string | null
			unit: { property_id: string } | null
		}
		const leaseExpirations = ((leases ?? []) as LeaseWithUnitProp[])
			.filter(lease => lease.end_date && new Date(lease.end_date) <= ninetyDays)
			.map(lease => {
				const unitInfo = unitMap.get(lease.unit_id)
				const propertyId = unitInfo?.propertyId ?? lease.unit?.property_id
				const propertyName = propertyId
					? (propertyMap.get(propertyId) ?? 'Property')
					: 'Property'
				return {
					leaseId: lease.id,
					propertyName,
					unitLabel: unitInfo?.unitLabel ?? 'Unit',
					endDate: lease.end_date
				}
			})

		const moveInsByMonth = new Map<string, number>()
		const moveOutsByMonth = new Map<string, number>()
		;(leases ?? []).forEach(lease => {
			if (lease.lease_status !== 'active') return
			const startKey = lease.start_date?.substring(0, 7)
			const endKey = lease.end_date?.substring(0, 7)
			if (startKey && monthBuckets.has(startKey)) {
				moveInsByMonth.set(startKey, (moveInsByMonth.get(startKey) ?? 0) + 1)
			}
			if (endKey && monthBuckets.has(endKey)) {
				moveOutsByMonth.set(endKey, (moveOutsByMonth.get(endKey) ?? 0) + 1)
			}
		})

		const turnover = Array.from(monthBuckets.keys()).map(month => ({
			month,
			moveIns: moveInsByMonth.get(month) ?? 0,
			moveOuts: moveOutsByMonth.get(month) ?? 0
		}))

		const totalPayments = paymentHistory.reduce(
			(sum, row) => sum + row.paymentsReceived,
			0
		)
		const onTimePayments = paymentHistory.reduce(
			(sum, row) => sum + (row.onTimeRate / 100) * row.paymentsReceived,
			0
		)
		const onTimePaymentRate = totalPayments
			? (onTimePayments / totalPayments) * 100
			: 0

		const activeLeases = (leases ?? []).filter(
			lease => lease.lease_status === 'active'
		).length

		const tenantIds = new Set<string>()
		;(leases ?? []).forEach(lease => {
			if (lease.primary_tenant_id) tenantIds.add(lease.primary_tenant_id)
		})
		const totalTenants = tenantIds.size
		const totalMoveIns = turnover.reduce((sum, row) => sum + row.moveIns, 0)
		const totalMoveOuts = turnover.reduce((sum, row) => sum + row.moveOuts, 0)
		const turnoverRate = totalTenants
			? ((totalMoveIns + totalMoveOuts) / Math.max(1, totalTenants)) * 100
			: 0

		return {
			summary: {
				totalTenants,
				activeLeases,
				leasesExpiringNext90: leaseExpirations.length,
				turnoverRate,
				onTimePaymentRate
			},
			paymentHistory,
			leaseExpirations,
			turnover
		}
	}
}
