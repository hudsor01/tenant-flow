/**
 * Financial Tax Document Query Options
 * Split from financial-keys.ts: tax document/year-end queries.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { financialKeys } from './financial-keys'
import type { TaxDocumentsData } from '#types/financial-statements'

export const financialTaxQueries = {
	taxDocuments: (year: number) =>
		queryOptions({
			queryKey: financialKeys.taxDocuments(year),
			queryFn: async (): Promise<TaxDocumentsData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const userId = user?.id
				if (!userId) {
					return {
						period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
						taxYear: year,
						totals: { totalIncome: 0, totalDeductions: 0, netTaxableIncome: 0 },
						incomeBreakdown: { grossRentalIncome: 0, totalExpenses: 0, netOperatingIncome: 0, depreciation: 0, mortgageInterest: 0, taxableIncome: 0 },
						schedule: { scheduleE: { grossRentalIncome: 0, totalExpenses: 0, depreciation: 0, netIncome: 0 } },
						expenseCategories: [],
						propertyDepreciation: []
					}
				}

				const [dashResult, expenseResult] = await Promise.all([
					supabase.rpc('get_dashboard_stats', { p_user_id: userId }),
					supabase.rpc('get_expense_summary', { p_user_id: userId })
				])

				if (dashResult.error) handlePostgrestError(dashResult.error, 'tax documents')

				const stats = (dashResult.data as Array<Record<string, unknown>> | null)?.[0]
				const revenue = stats?.revenue as Record<string, unknown> | undefined
				const totalIncome = Number(revenue?.yearly ?? 0)
				const expenseSummary = expenseResult.data as Record<string, unknown> | null
				const totalExpenses = Number(expenseSummary?.total_amount ?? 0)
				const netIncome = totalIncome - totalExpenses

				return {
					period: { start_date: `${year}-01-01`, end_date: `${year}-12-31`, label: `Tax Year ${year}` },
					taxYear: year,
					totals: { totalIncome, totalDeductions: totalExpenses, netTaxableIncome: netIncome },
					incomeBreakdown: {
						grossRentalIncome: totalIncome,
						totalExpenses,
						netOperatingIncome: netIncome,
						depreciation: 0,
						mortgageInterest: 0,
						taxableIncome: netIncome
					},
					schedule: { scheduleE: { grossRentalIncome: totalIncome, totalExpenses, depreciation: 0, netIncome } },
					expenseCategories: ((expenseSummary?.categories ?? []) as Array<Record<string, unknown>>).map(c => ({
						category: String(c.category ?? ''),
						amount: Number(c.amount ?? 0),
						percentage: Number(c.percentage ?? 0),
						deductible: true
					})),
					propertyDepreciation: []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		})
}
