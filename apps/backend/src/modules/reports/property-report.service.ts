import { Injectable } from '@nestjs/common'
import type { OccupancyMetrics, PropertyReport } from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMonthBuckets,
	loadPropertyIdsByOwner,
	parseDateRange
} from './reports.utils'

@Injectable()
export class PropertyReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	private get sb(): SupabaseService {
		return this.supabase
	}

	private getEmptyPropertyReport(): PropertyReport {
		return {
			summary: {
				totalProperties: 0,
				totalUnits: 0,
				occupiedUnits: 0,
				occupancyRate: 0
			},
			byProperty: [],
			occupancyTrend: [],
			vacancyTrend: []
		}
	}

	private getEmptyOccupancyMetrics(): OccupancyMetrics {
		return {
			totalUnits: 0,
			occupiedUnits: 0,
			vacantUnits: 0,
			occupancyRate: 0,
			byProperty: []
		}
	}

	/**
	 * Get occupancy metrics across all properties
	 */
	async getOccupancyMetrics(user_id: string): Promise<OccupancyMetrics> {
		try {
			const client = this.sb.getAdminClient()

			// Get user's properties with units (owner_user_id is now directly on properties table)
			const { data: properties } = await client
				.from('properties')
				.select(
					`
					id,
					name,
					units(
						id,
						leases(id, lease_status)
					)
					`
				)
				.eq('owner_user_id', user_id)

			if (!properties) {
				return this.getEmptyOccupancyMetrics()
			}

			let totalUnits = 0
			let occupiedUnits = 0
			const byProperty: OccupancyMetrics['byProperty'] = []

			type PropertyWithUnitsAndLeases = {
				id: string
				name: string
				units: Array<{
					id: string
					leases: Array<{ id: string; lease_status: string }> | null
				}>
			}

			properties.forEach((property: PropertyWithUnitsAndLeases) => {
				const units = property.units || []
				const occupied = units.filter(unit =>
					unit.leases?.some(lease => lease.lease_status === 'active')
				).length

				totalUnits += units.length
				occupiedUnits += occupied

				byProperty.push({
					property_id: property.id,
					propertyName: property.name,
					totalUnits: units.length,
					occupiedUnits: occupied,
					occupancyRate: units.length > 0 ? (occupied / units.length) * 100 : 0
				})
			})

			return {
				totalUnits,
				occupiedUnits,
				vacantUnits: totalUnits - occupiedUnits,
				occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
				byProperty
			}
		} catch (error) {
			this.logger.error('Failed to get occupancy metrics', { error })
			throw error
		}
	}

	/**
	 * Property report data: occupancy, vacancy, performance metrics
	 */
	async getPropertyReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<PropertyReport> {
		const { start, end } = parseDateRange(start_date, end_date)
		const property_ids = await loadPropertyIdsByOwner(
			this.sb,
			this.logger,
			user_id
		)

		if (property_ids.length === 0) {
			return this.getEmptyPropertyReport()
		}

		const monthBuckets = buildMonthBuckets(start, end)

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const { data: units } = await this.sb
			.getAdminClient()
			.from('units')
			.select('id, property_id')
			.in('property_id', property_ids)

		// Get unit_ids for properties first
		const unitIds = units?.map(u => u.id) ?? []
		const { data: activeLeases } = await this.sb
			.getAdminClient()
			.from('leases')
			.select('id, unit_id, unit:units!leases_unit_id_fkey(property_id)')
			.in('unit_id', unitIds)
			.eq('lease_status', 'active')

		const { data: payments } = await this.sb
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				amount,
				status,
				created_at,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.in('lease.unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const { data: maintenance } = await this.sb
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				actual_cost,
				estimated_cost,
				completed_at,
				created_at,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const unitMap = new Map<string, { total: number; occupied: number }>()
		;(units ?? []).forEach(unit => {
			const entry = unitMap.get(unit.property_id) ?? { total: 0, occupied: 0 }
			entry.total += 1
			unitMap.set(unit.property_id, entry)
		})

		type LeaseWithUnitRef = {
			id: string
			unit_id: string
			unit: { property_id: string } | null
		}
		;((activeLeases ?? []) as LeaseWithUnitRef[]).forEach(lease => {
			const propertyId = lease.unit?.property_id
			if (!propertyId) return
			const entry = unitMap.get(propertyId) ?? { total: 0, occupied: 0 }
			entry.occupied += 1
			unitMap.set(propertyId, entry)
		})

		const revenueByProperty = new Map<string, number>()
		type PaymentWithLeaseUnit = {
			amount: number | null
			status: string | null
			created_at: string | null
			lease: { unit: { property_id: string } | null } | null
		}
		;((payments ?? []) as PaymentWithLeaseUnit[]).forEach(payment => {
			if (payment.status !== 'succeeded') return
			const propertyId = payment.lease?.unit?.property_id
			if (!propertyId) return
			const amount = payment.amount ? payment.amount / 100 : 0
			revenueByProperty.set(
				propertyId,
				(revenueByProperty.get(propertyId) ?? 0) + amount
			)
		})

		const expensesByProperty = new Map<string, number>()
		;(maintenance ?? []).forEach(request => {
			const propertyId = request.unit?.property_id
			if (!propertyId) return
			const cost = (request.actual_cost ?? request.estimated_cost ?? 0) / 100
			expensesByProperty.set(
				propertyId,
				(expensesByProperty.get(propertyId) ?? 0) + cost
			)
			const monthKey =
				request.completed_at?.substring(0, 7) ??
				request.created_at?.substring(0, 7)
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})
		;(payments ?? []).forEach(payment => {
			if (payment.status !== 'succeeded') return
			const monthKey = payment.created_at?.substring(0, 7)
			const amount = payment.amount ? payment.amount / 100 : 0
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.income += amount
			}
		})

		const byProperty = (properties ?? []).map(property => {
			const entry = unitMap.get(property.id) ?? { total: 0, occupied: 0 }
			const occupancyRate = entry.total
				? (entry.occupied / entry.total) * 100
				: 0
			const revenue = revenueByProperty.get(property.id) ?? 0
			const expenses = expensesByProperty.get(property.id) ?? 0
			return {
				propertyId: property.id,
				propertyName: property.name,
				occupancyRate,
				vacantUnits: Math.max(0, entry.total - entry.occupied),
				revenue,
				expenses,
				netOperatingIncome: revenue - expenses
			}
		})

		const totalUnits = Array.from(unitMap.values()).reduce(
			(sum, row) => sum + row.total,
			0
		)
		const occupiedUnits = Array.from(unitMap.values()).reduce(
			(sum, row) => sum + row.occupied,
			0
		)
		const occupancyRate = totalUnits ? (occupiedUnits / totalUnits) * 100 : 0

		const occupancyTrend = Array.from(monthBuckets.entries()).map(
			([month, _values]) => {
				const monthlyRate = totalUnits ? (occupiedUnits / totalUnits) * 100 : 0
				return { month, occupancyRate: monthlyRate }
			}
		)

		const vacancyTrend = Array.from(monthBuckets.entries()).map(([month]) => ({
			month,
			vacantUnits: Math.max(0, totalUnits - occupiedUnits)
		}))

		return {
			summary: {
				totalProperties: property_ids.length,
				totalUnits,
				occupiedUnits,
				occupancyRate
			},
			byProperty,
			occupancyTrend,
			vacancyTrend
		}
	}
}
