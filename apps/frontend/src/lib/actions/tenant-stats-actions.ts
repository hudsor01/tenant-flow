/**
 * Tenant Statistics Server Actions
 * MOVED FROM: components/tenants/tenants-stats.tsx
 * REASON: Statistical calculations belong in backend for data consistency and performance
 */

'use server'

import { apiClient } from '@/lib/api-client'
import type { Tenant } from '@repo/shared'

export interface TenantStatsResult {
	totalTenants: number
	acceptedInvitations: number
	pendingInvitations: number
	expiringLeases: number
}

/**
 * Calculate Tenant Statistics - Server Action
 * MOVED FROM: Frontend client-side calculation
 * REASON: Backend calculations ensure data consistency and can access lease data
 */
export async function calculateTenantStats(): Promise<TenantStatsResult> {
	try {
		// Fetch tenants data from backend
		const tenants = await apiClient.get<Tenant[]>('/tenants')
		
		if (!tenants || !Array.isArray(tenants)) {
			return {
				totalTenants: 0,
				acceptedInvitations: 0,
				pendingInvitations: 0,
				expiringLeases: 0
			}
		}

		const totalTenants = tenants.length
		const acceptedInvitations = tenants.filter(
			tenant => tenant.invitationStatus === 'ACCEPTED'
		).length
		const pendingInvitations = tenants.filter(
			tenant =>
				tenant.invitationStatus === 'PENDING' ||
				tenant.invitationStatus === 'SENT'
		).length

		// TODO: Calculate expiring leases when lease data is available
		// This would require backend endpoint that includes lease information
		const expiringLeases = 0

		return {
			totalTenants,
			acceptedInvitations,
			pendingInvitations,
			expiringLeases
		}
	} catch (error) {
		console.error('Failed to calculate tenant stats:', error)
		return {
			totalTenants: 0,
			acceptedInvitations: 0,
			pendingInvitations: 0,
			expiringLeases: 0
		}
	}
}