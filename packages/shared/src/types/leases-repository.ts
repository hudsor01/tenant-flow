import type { Lease, LeaseStats, QueryParams, RentPayment } from './core.js'
import type { Database } from './supabase-generated.js'

export type LeaseInput = Database['public']['Tables']['lease']['Insert']
export type LeaseUpdate = Database['public']['Tables']['lease']['Update']

export interface LeaseQueryOptions extends QueryParams {
	propertyId?: string
	tenantId?: string
	status?: Database['public']['Enums']['LeaseStatus']
	startDate?: Date
	endDate?: Date
}

export interface LeasesRepositoryContract {
	findByUserIdWithSearch(
		userId: string,
		options: LeaseQueryOptions
	): Promise<Lease[]>
	findById(leaseId: string): Promise<Lease | null>
	findByPropertyId(propertyId: string): Promise<Lease[]>
	findByTenantId(tenantId: string): Promise<Lease[]>
	create(userId: string, leaseData: LeaseInput): Promise<Lease>
	update(leaseId: string, leaseData: LeaseUpdate): Promise<Lease | null>
	softDelete(
		userId: string,
		leaseId: string
	): Promise<{ success: boolean; message: string }>
	getStats(userId: string): Promise<LeaseStats>
	getAnalytics(
		userId: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<Lease[]>
	getExpiringSoon(userId: string, days: number): Promise<Lease[]>
	getActiveLeases(propertyId: string): Promise<Lease[]>
	renewLease(leaseId: string, renewalData: Partial<LeaseInput>): Promise<Lease>
	terminateLease(
		leaseId: string,
		terminationDate: Date,
		reason?: string
	): Promise<Lease | null>
	getPaymentHistory(leaseId: string): Promise<RentPayment[]>
}
