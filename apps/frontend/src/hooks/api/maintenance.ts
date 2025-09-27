
'use client'

import { maintenanceApi } from '@/lib/api-client'
import type { MaintenanceRequestRow, Database } from '@repo/shared'
import { useQuery } from '@tanstack/react-query'

// Define the expected shape of the API response
export type MaintenanceRequestResponse = {
    data: MaintenanceRequestRow[]
    total: number
    limit: number
    offset: number
}

type MaintenanceStatus = Database['public']['Enums']['RequestStatus']

export function useMaintenanceRequests(status?: MaintenanceStatus) {
    return useQuery<MaintenanceRequestResponse, Error, MaintenanceRequestRow[]>({ // Add types for data, error, and selection
        queryKey: ['maintenance', status ?? 'ALL'],
        queryFn: async () => maintenanceApi.list(status ? { status } : undefined),
        select: (data) => data.data // Select the array of requests from the response
    })
}
