/**
 * TanStack Query hook for tax documents
 */
import { clientFetch } from '#lib/api/client'
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { useQuery } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

export const taxDocumentsKeys = {
	all: ['tax-documents'] as const,
	byYear: (year: number) => [...taxDocumentsKeys.all, year] as const
}

export function useTaxDocuments(taxYear: number) {
	return useQuery({
		queryKey: taxDocumentsKeys.byYear(taxYear),
		queryFn: async (): Promise<TaxDocumentsData> => {
			const response = await clientFetch<{
				data: TaxDocumentsData
				success: boolean
			}>(`/api/v1/financials/tax-documents?taxYear=${taxYear}`)

			return response.data
		},
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}
