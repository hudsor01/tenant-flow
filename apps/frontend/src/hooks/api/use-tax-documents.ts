/**
 * TanStack Query hook for tax documents
 */
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '#providers/auth-provider'

export const taxDocumentsKeys = {
	all: ['tax-documents'] as const,
	byYear: (year: number) => [...taxDocumentsKeys.all, year] as const
}

export function useTaxDocuments(taxYear: number) {
	const { session } = useAuth()

	return useQuery({
		queryKey: taxDocumentsKeys.byYear(taxYear),
		queryFn: async (): Promise<TaxDocumentsData> => {
			if (!session?.access_token) {
				throw new Error('Authentication required')
			}
			
			const res = await fetch(
				`/api/v1/financials/tax-documents?taxYear=${taxYear}`,
				{
					credentials: 'include',
					cache: 'no-store'
				}
			)
			
			if (!res.ok) {
				throw new Error('Failed to fetch tax documents')
			}
			
			const response = await res.json()
			return response.data
		},
		enabled: !!session?.access_token,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}
