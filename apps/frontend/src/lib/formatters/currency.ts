import {
	formatCurrency as sharedFormatCurrency,
	formatPrice,
	formatCompactCurrency,
	formatPercentage,
	formatNumber as sharedFormatNumber,
	formatCurrencyChange,
	formatPercentageChange,
	getDashboardCurrency,
	getDashboardPercentage,
	getCollectionRateStatus,
	type CurrencyFormatOptions,
	type PriceFormatOptions,
	type CurrencyCode
} from '@repo/shared/utils/currency'

export const formatCurrency = (
	amount: number,
	options: CurrencyFormatOptions = {}
): string => {
	const {
		minimumFractionDigits = 2,
		maximumFractionDigits = 2,
		...rest
	} = options

	return sharedFormatCurrency(amount, {
		minimumFractionDigits,
		maximumFractionDigits,
		...rest
	})
}

export const formatCents = (
	cents: number,
	options?: CurrencyFormatOptions
): string =>
	formatCurrency(cents / 100, options)

export const formatNumber = sharedFormatNumber

export {
	formatPrice,
	formatCompactCurrency,
	formatPercentage,
	formatCurrencyChange,
	formatPercentageChange,
	getDashboardCurrency,
	getDashboardPercentage,
	getCollectionRateStatus
}

export type { CurrencyFormatOptions, PriceFormatOptions, CurrencyCode }
