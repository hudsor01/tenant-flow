/**
 * Leases API Client
 * Phase 6.3: Lease Renewals
 */

import type { Database } from '@repo/shared/types/supabase-generated'
import { apiClient } from '@repo/shared/utils/api-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

type Lease = Database['public']['Tables']['Lease']['Row']

export interface RenewLeaseRequest {
	endDate: string
	rentAmount?: number
}

export const leasesApi = {
	/**
	 * Renew a lease with new end date and optional rent increase
	 */
	renew: async (leaseId: string, data: RenewLeaseRequest): Promise<Lease> => {
		return await apiClient<Lease>(
			`${API_BASE_URL}/api/v1/leases/${leaseId}/renew`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		)
	}
}
