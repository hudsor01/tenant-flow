import type {
	BalanceSheetData,
	CashFlowData,
	IncomeStatementData,
	TaxDocumentsData
} from '@repo/shared/types/financial-statements'
import { getApiBaseUrl } from '@repo/shared/utils/api-utils'

const API_BASE_URL = getApiBaseUrl()

async function fetchWithAuth(
	url: string,
	token: string,
	options?: RequestInit
) {
	const response = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...options?.headers
		},
		cache: 'no-store'
	})

	if (!response.ok) {
		const { ApiErrorCode, createApiErrorFromResponse } = await import(
			'@repo/shared/utils/api-error'
		)
		throw createApiErrorFromResponse(
			response,
			ApiErrorCode.FINANCIAL_DATA_FETCH_FAILED
		)
	}

	return response.json()
}

export async function getIncomeStatement(
	token: string,
	startDate: string,
	endDate: string
): Promise<IncomeStatementData> {
	const url = `${API_BASE_URL}/financials/income-statement?startDate=${startDate}&endDate=${endDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getCashFlowStatement(
	token: string,
	startDate: string,
	endDate: string
): Promise<CashFlowData> {
	const url = `${API_BASE_URL}/financials/cash-flow?startDate=${startDate}&endDate=${endDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getBalanceSheet(
	token: string,
	asOfDate: string
): Promise<BalanceSheetData> {
	const url = `${API_BASE_URL}/financials/balance-sheet?asOfDate=${asOfDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getTaxDocuments(
	token: string,
	taxYear: number
): Promise<TaxDocumentsData> {
	const url = `${API_BASE_URL}/financials/tax-documents?taxYear=${taxYear}`
	const result = await fetchWithAuth(url, token)
	return result.data
}
