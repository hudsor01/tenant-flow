import type {
	BalanceSheetData,
	CashFlowData,
	IncomeStatementData,
	TaxDocumentsData
} from '@repo/shared/types/financial-statements'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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
		throw new Error(`API Error: ${response.statusText}`)
	}

	return response.json()
}

export async function getIncomeStatement(
	token: string,
	startDate: string,
	endDate: string
): Promise<IncomeStatementData> {
	const url = `${API_URL}/financial/income-statement?startDate=${startDate}&endDate=${endDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getCashFlowStatement(
	token: string,
	startDate: string,
	endDate: string
): Promise<CashFlowData> {
	const url = `${API_URL}/financial/cash-flow?startDate=${startDate}&endDate=${endDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getBalanceSheet(
	token: string,
	asOfDate: string
): Promise<BalanceSheetData> {
	const url = `${API_URL}/financial/balance-sheet?asOfDate=${asOfDate}`
	const result = await fetchWithAuth(url, token)
	return result.data
}

export async function getTaxDocuments(
	token: string,
	taxYear: number
): Promise<TaxDocumentsData> {
	const url = `${API_URL}/financial/tax-documents?taxYear=${taxYear}`
	const result = await fetchWithAuth(url, token)
	return result.data
}
