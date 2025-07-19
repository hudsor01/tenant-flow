import { useMemo } from 'react'
import { trpc } from '@/lib/api'
import type { PropertyWithUnitsAndLeases } from '@/types/relationships'
import type { Unit, Lease, Tenant } from '@/types/entities'

interface UsePropertyDetailDataProps {
	propertyId: string | undefined
}

interface PropertyStats {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	totalMonthlyRent: number
	potentialRent: number
}

/**
 * Custom hook for managing property detail data and statistics
 * Handles complex property fetching with units, leases, tenants, and payments
 */
export function usePropertyDetailData({
	propertyId
}: UsePropertyDetailDataProps) {
	// Fetch property with all related data
	const {
		data: apiProperty,
		isLoading,
		error
	} = trpc.properties.byId.useQuery(
		{ id: propertyId! },
		{ enabled: !!propertyId }
	)

	// Transform API response to match existing interface
	const property: PropertyWithUnitsAndLeases | undefined = useMemo(() => {
		if (!apiProperty) return undefined

		return {
			...apiProperty,
			units:
				apiProperty.units?.map(unit => ({
					...unit,
					leases:
						unit.leases?.map((lease: { tenant: string }) => ({
							...lease,
							tenant: lease.tenant || ({} as string)
						})) || []
				})) || []
		} as PropertyWithUnitsAndLeases
	}, [apiProperty])

	// Calculate property statistics
	const stats: PropertyStats = useMemo(() => {
		if (!property?.units) {
			return {
				totalUnits: 0,
				occupiedUnits: 0,
				vacantUnits: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0,
				potentialRent: 0
			}
		}

		const totalUnits = property.units.length

		const occupiedUnits = property.units.filter(
			(
				unit: Unit & {
					leases: (Lease & {
						tenant: Tenant
					})[]
				}
			) =>
				unit.status === 'OCCUPIED' &&
				unit.leases?.some((lease: Lease) => lease.status === 'ACTIVE')
		).length

		const vacantUnits = totalUnits - occupiedUnits
		const occupancyRate =
			totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

		const totalMonthlyRent = property.units.reduce(
			(
				sum: number,
				unit: Unit & {
					leases: (Lease & {
						tenant: Tenant
					})[]
				}
			) => {
				if (
					unit.status === 'OCCUPIED' &&
					unit.leases &&
					unit.leases.length > 0
				) {
					const activeLeases = unit.leases.filter(
						(lease: Lease) => lease.status === 'ACTIVE'
					)
					return (
						sum +
						(activeLeases.length > 0
							? activeLeases[0].rentAmount
							: 0)
					)
				}
				return sum
			},
			0
		)

		const potentialRent = property.units.reduce(
			(
				sum: number,
				unit: Unit & {
					leases: (Lease & {
						tenant: Tenant
					})[]
				}
			) => sum + unit.rent,
			0
		)

		return {
			totalUnits,
			occupiedUnits,
			vacantUnits,
			occupancyRate,
			totalMonthlyRent,
			potentialRent
		}
	}, [property?.units])

	// Animation configuration
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 }
	}

	return {
		property,
		isLoading,
		error,
		stats,
		fadeInUp
	}
}

/**
 * Helper function to get unit lease information
 */
export function getUnitLeaseInfo(unit: Unit & {
	leases?: (Lease & { tenant?: Tenant })[]
}) {
	const unitData = unit
	const activeLease = unitData.leases?.find(
		lease => lease.status === 'ACTIVE'
	)
	const tenant = activeLease?.tenant

	return {
		activeLease,
		tenant,
		hasActiveLease: !!activeLease
	}
}

/**
 * Helper function to format currency
 */
export function formatCurrency(amount: number): string {
	return amount.toLocaleString()
}
