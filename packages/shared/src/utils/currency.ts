/**
 * Currency and price formatting utilities for consistent display across the application
 * Consolidates multiple formatPrice implementations into a single shared utility
 */

export type BillingInterval = 'monthly' | 'annual' | 'month' | 'year'
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'

export interface CurrencyFormatOptions {
  locale?: string
  currency?: CurrencyCode
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  compact?: boolean
}

export interface PriceFormatOptions extends CurrencyFormatOptions {
  interval?: BillingInterval
  showInterval?: boolean
  fromCents?: boolean
}

/**
 * Core currency formatter with flexible options
 */
export const formatCurrency = (
  amount: number,
  options: CurrencyFormatOptions = {}
): string => {
  const {
    locale = 'en-US',
    currency = 'USD',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false
  } = options

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short'
  })

  return formatter.format(amount)
}

/**
 * Format price with special handling for Free/Custom and intervals
 * Consolidates all formatPrice implementations across the codebase
 */
export const formatPrice = (
  amount: number,
  options: PriceFormatOptions = {}
): string => {
  const {
    interval,
    showInterval = true,
    fromCents = false,
    currency = 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
    ...formatOptions
  } = options

  // Handle special values
  if (amount === 0) return 'Free'
  if (amount === -1) return 'Custom'

  // Convert from cents if needed
  const dollarAmount = fromCents ? amount / 100 : amount

  // Determine fraction digits based on amount if not specified
  const shouldShowDecimals = fromCents ? amount % 100 !== 0 : dollarAmount % 1 !== 0
  const finalMinFractionDigits = minimumFractionDigits ?? (shouldShowDecimals ? 2 : 0)
  const finalMaxFractionDigits = maximumFractionDigits ?? (shouldShowDecimals ? 2 : 0)

  // Format the currency
  const formatted = formatCurrency(dollarAmount, {
    currency,
    minimumFractionDigits: finalMinFractionDigits,
    maximumFractionDigits: finalMaxFractionDigits,
    ...formatOptions
  })

  // Add interval suffix if requested
  if (showInterval && interval) {
    const suffix = getIntervalSuffix(interval)
    return `${formatted}${suffix}`
  }

  return formatted
}

/**
 * Get interval suffix for pricing display
 */
export const getIntervalSuffix = (interval: BillingInterval): string => {
  switch (interval) {
    case 'monthly':
    case 'month':
      return '/mo'
    case 'annual':
    case 'year':
      return '/yr'
    default:
      return ''
  }
}

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatCompactCurrency = (
  amount: number,
  currency: CurrencyCode = 'USD'
): string => {
  return formatCurrency(amount, { 
    compact: true, 
    maximumFractionDigits: 1,
    currency 
  })
}

/**
 * Format percentage with consistent styling
 */
export const formatPercentage = (
  value: number,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string => {
  const { minimumFractionDigits = 0, maximumFractionDigits = 1 } = options

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits
  })

  return formatter.format(value / 100)
}

/**
 * Format numbers with thousand separators
 */
export const formatNumber = (
  value: number,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    compact?: boolean
  } = {}
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    compact = false
  } = options

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short'
  })

  return formatter.format(value)
}

/**
 * Format currency change with proper +/- indicators
 */
export const formatCurrencyChange = (
  amount: number,
  showSign = true,
  currency: CurrencyCode = 'USD'
): string => {
  const formatted = formatCurrency(Math.abs(amount), { currency })
  if (!showSign) return formatted

  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}

/**
 * Format percentage change with proper +/- indicators
 */
export const formatPercentageChange = (
  value: number,
  showSign = true
): string => {
  const formatted = formatPercentage(Math.abs(value))
  if (!showSign) return formatted

  return value >= 0 ? `+${formatted}` : `-${formatted}`
}

/**
 * Get currency display for dashboard cards
 */
export const getDashboardCurrency = (
  amount: number,
  currency: CurrencyCode = 'USD'
): {
  value: string
  compact: string
  raw: number
} => {
  return {
    value: formatCurrency(amount, { currency }),
    compact: formatCompactCurrency(amount, currency),
    raw: amount
  }
}

/**
 * Get percentage display with color coding
 */
export const getDashboardPercentage = (
  value: number
): {
  value: string
  color: string
  trend: 'positive' | 'negative' | 'neutral'
} => {
  let trend: 'positive' | 'negative' | 'neutral'
  if (value > 0) {
    trend = 'positive'
  } else if (value < 0) {
    trend = 'negative'
  } else {
    trend = 'neutral'
  }

  let color: string
  if (trend === 'positive') {
    color = 'text-green-600'
  } else if (trend === 'negative') {
    color = 'text-red-600'
  } else {
    color = 'text-muted-foreground'
  }

  return {
    value: formatPercentage(value),
    color,
    trend
  }
}

/**
 * Collection rate status helper
 */
export const getCollectionRateStatus = (
  rate: number
): {
  status: string
  color: string
  icon: string
} => {
  if (rate >= 95) {
    return { status: 'Excellent', color: 'text-green-600', icon: '🎯' }
  } else if (rate >= 85) {
    return { status: 'Good', color: 'text-blue-600', icon: '👍' }
  } else if (rate >= 70) {
    return { status: 'Fair', color: 'text-orange-600', icon: '⚠️' }
  } else {
    return { status: 'Poor', color: 'text-red-600', icon: '🔻' }
  }
}

// Legacy aliases for backward compatibility
export const formatPriceFromCents = (priceInCents: number, currency: CurrencyCode = 'USD'): string => {
  return formatPrice(priceInCents, { fromCents: true, currency, showInterval: false })
}

export const formatPriceWithInterval = (
  amount: number, 
  interval: BillingInterval,
  fromCents = false
): string => {
  return formatPrice(amount, { interval, fromCents })
}