export type LeaseStatus = 'active' | 'expiring' | 'vacant'

export type PortfolioRow = {
	id: string
	property: string
	address: string
	units: { occupied: number; total: number }
	tenant: string | null
	leaseStatus: LeaseStatus
	rent: number
}
