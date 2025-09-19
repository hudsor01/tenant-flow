
'use client'

import { maintenanceApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useQuery } from '@tanstack/react-query'

// Correctly define the type for a single maintenance request
export type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row'] & {
    property: { name: string } | null
    unit: { name: string } | null
    assignedTo: { name: string } | null
}

// Define the expected shape of the API response
export type MaintenanceRequestResponse = {
    data: MaintenanceRequest[]
    total: number
    limit: number
    offset: number
}

type MaintenanceStatus = Database['public']['Enums']['RequestStatus']

export function useMaintenanceRequests(status?: MaintenanceStatus) {
    return useQuery<MaintenanceRequestResponse, Error, MaintenanceRequest[]>({ // Add types for data, error, and selection
        queryKey: ['maintenance', status ?? 'ALL'],
        queryFn: async () => maintenanceApi.list(status ? { status } : undefined),
        select: (data) => data.data // Select the array of requests from the response
    })
}
