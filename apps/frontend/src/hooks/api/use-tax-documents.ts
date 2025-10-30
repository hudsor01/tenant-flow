/**
 * TanStack Query hook for tax documents
 */
import { useQuery } from '@tanstack/react-query'
import { getTaxDocuments } from '#lib/api/financials-client'
import { useAuth } from '#providers/auth-provider'

export const taxDocumentsKeys = {
	all: ['tax-documents'] as const,
	byYear: (year: number) => [...taxDocumentsKeys.all, year] as const
}

export function useTaxDocuments(taxYear: number) {
	const { session } = useAuth()

	return useQuery({
		queryKey: taxDocumentsKeys.byYear(taxYear),
		queryFn: async () => {
			if (!session?.access_token) {
				throw new Error('Authentication required')
			}
			return getTaxDocuments(session.access_token, taxYear)
		},
		enabled: !!session?.access_token,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}
