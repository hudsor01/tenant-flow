import { useMemo } from 'react'
import { useProperty } from '@/hooks/useProperties'
import type { PropertyWithUnitsAndLeases } from '@tenantflow/shared'
import type { Unit } from '@tenantflow/shared'
import type { Lease } from '@tenantflow/shared'
import type { Tenant } from '@tenantflow/shared'

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
	} = useProperty(propertyId!)

	// Add a type assertion to help TypeScript
	const property: PropertyWithUnitsAndLeases | undefined = useMemo(() => {
		if (!apiProperty) return undefined

		const propertyWithUnits = apiProperty as PropertyWithUnitsAndLeases

		return {
			...propertyWithUnits,
			units:
				propertyWithUnits.units?.map((unit: Unit & { leases?: (Lease & { tenant?: Tenant })[] }) => ({
					...unit,
					leases:
						unit.leases?.map(
							(lease: Lease & { tenant?: Tenant }) => ({
								...lease,
								tenant: lease.tenant || ({} as Tenant)
							})
						) || []
				})) || []
		}
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
			(unit: Unit & { leases?: (Lease & { tenant?: Tenant })[] }) =>
				unit.status === 'OCCUPIED' &&
				unit.leases?.some((lease: Lease) => lease.status === 'ACTIVE')
		).length

		const vacantUnits = totalUnits - occupiedUnits
		const occupancyRate =
			totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

		const totalMonthlyRent = property.units.reduce(
			(
				sum: number,
				unit: Unit & { leases?: (Lease & { tenant?: Tenant })[] }
			) => {
				if (unit.status === 'OCCUPIED') {
					const activeLeases =
						unit.leases?.filter(
							(lease: Lease) => lease.status === 'ACTIVE'
						) || []
					return sum + (activeLeases[0]?.rentAmount ?? 0)
				}
				return sum
			},
			0
		)

		const potentialRent = property.units.reduce(
			(
				sum: number,
				unit: Unit & { leases?: (Lease & { tenant?: Tenant })[] }
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
export function getUnitLeaseInfo(
	unit: Unit & {
		leases?: (Lease & { tenant?: Tenant })[]
	}
) {
	const unitData = unit
	const activeLease = unitData.leases?.find(
		(lease: Lease & { tenant?: Tenant }) => lease.status === 'ACTIVE'
	)
	const tenant = activeLease?.tenant

	return {
		activeLease,
		tenant,
		hasActiveLease: !!activeLease
	}
}

