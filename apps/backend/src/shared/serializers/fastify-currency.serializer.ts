/**
 * Native Fastify Currency Serializer
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> origin/main
 * Purpose: Handle currency amounts with proper precision and formatting
 * Use Case: Stripe amounts (cents) and rent calculations
 * Implementation: Applied only to routes handling financial data
 */

import type { FastifyInstance } from 'fastify'

/**
 * Currency serializer configuration
 */
export interface CurrencySerializerOptions {
<<<<<<< HEAD
	/**
	 * Default currency code
	 * @default 'USD'
	 */
	defaultCurrency?: string

	/**
	 * Whether to convert cents to dollars for display
	 * @default true (Stripe uses cents, UI expects dollars)
	 */
	convertCentsToDisplay?: boolean

	/**
	 * Number of decimal places for display
	 * @default 2
	 */
	decimalPlaces?: number

	/**
	 * Whether to include currency symbol in serialized output
	 * @default false (return numeric values only)
	 */
	includeCurrencySymbol?: boolean
=======
  /**
   * Default currency code
   * @default 'USD'
   */
  defaultCurrency?: string
  
  /**
   * Whether to convert cents to dollars for display
   * @default true (Stripe uses cents, UI expects dollars)
   */
  convertCentsToDisplay?: boolean
  
  /**
   * Number of decimal places for display
   * @default 2
   */
  decimalPlaces?: number
  
  /**
   * Whether to include currency symbol in serialized output
   * @default false (return numeric values only)
   */
  includeCurrencySymbol?: boolean
>>>>>>> origin/main
}

/**
 * Currency amount type for type safety
 */
export interface CurrencyAmount {
<<<<<<< HEAD
	amount: number
	currency: string
	/** Internal flag to identify currency objects */
	__isCurrency?: boolean
=======
  amount: number
  currency: string
  /** Internal flag to identify currency objects */
  __isCurrency?: boolean
>>>>>>> origin/main
}

/**
 * Create a currency amount object
 * Use this helper to mark values as currency in your services
 */
export function createCurrencyAmount(
<<<<<<< HEAD
	amount: number,
	currency = 'USD'
): CurrencyAmount {
	return {
		amount,
		currency: currency.toUpperCase(),
		__isCurrency: true
	}
=======
  amount: number, 
  currency = 'USD'
): CurrencyAmount {
  return {
    amount,
    currency: currency.toUpperCase(),
    __isCurrency: true
  }
>>>>>>> origin/main
}

/**
 * Currency serializer for consistent financial data formatting
 */
<<<<<<< HEAD
export function createCurrencySerializer(
	options: CurrencySerializerOptions = {}
) {
	const {
		convertCentsToDisplay = true,
		decimalPlaces = 2,
		includeCurrencySymbol = false
	} = options

	return function currencySerializer(
		this: FastifyInstance,
		payload: unknown
	): string | number {
		// Handle currency amount objects
		if (
			payload &&
			typeof payload === 'object' &&
			'__isCurrency' in payload
		) {
			const currencyObj = payload as CurrencyAmount
			const { amount, currency } = currencyObj

			// Convert cents to dollars if needed (Stripe amounts are in cents)
			let displayAmount = amount
			if (convertCentsToDisplay && amount >= 100) {
				displayAmount = amount / 100
			}

			// Round to specified decimal places
			displayAmount = Number(displayAmount.toFixed(decimalPlaces))

			if (includeCurrencySymbol) {
				const symbols: Record<string, string> = {
					USD: '$',
					EUR: '€',
					GBP: '£'
				}
				const symbol = symbols[currency] ?? currency
				return `${symbol}${displayAmount}`
			}

			return displayAmount
		}

		// Handle plain numbers that might be currency (when field name suggests currency)
		if (typeof payload === 'number') {
			return convertCentsToDisplay && payload >= 100
				? Number((payload / 100).toFixed(decimalPlaces))
				: Number(payload.toFixed(decimalPlaces))
		}

		return JSON.stringify(payload)
	}
=======
export function createCurrencySerializer(options: CurrencySerializerOptions = {}) {
  const {
    convertCentsToDisplay = true,
    decimalPlaces = 2,
    includeCurrencySymbol = false
  } = options

  return function currencySerializer(this: FastifyInstance, payload: unknown): string | number {
    // Handle currency amount objects
    if (payload && typeof payload === 'object' && '__isCurrency' in payload) {
      const currencyObj = payload as CurrencyAmount
      const { amount, currency } = currencyObj
      
      // Convert cents to dollars if needed (Stripe amounts are in cents)
      let displayAmount = amount
      if (convertCentsToDisplay && amount >= 100) {
        displayAmount = amount / 100
      }
      
      // Round to specified decimal places
      displayAmount = Number(displayAmount.toFixed(decimalPlaces))
      
      if (includeCurrencySymbol) {
        const symbols: Record<string, string> = {
          USD: '$',
          EUR: '€',
          GBP: '£'
        }
        const symbol = symbols[currency] || currency
        return `${symbol}${displayAmount}`
      }
      
      return displayAmount
    }
    
    // Handle plain numbers that might be currency (when field name suggests currency)
    if (typeof payload === 'number') {
      return convertCentsToDisplay && payload >= 100 
        ? Number((payload / 100).toFixed(decimalPlaces))
        : Number(payload.toFixed(decimalPlaces))
    }
    
    return JSON.stringify(payload)
  }
>>>>>>> origin/main
}

/**
 * Register currency serializer for financial routes
 * Apply to specific endpoints that handle payments, rent, etc.
 */
export function registerCurrencySerializerForRoute(
<<<<<<< HEAD
	fastify: FastifyInstance,
	options: CurrencySerializerOptions = {}
) {
	const serializer = createCurrencySerializer(options)

	fastify.setSerializerCompiler(({ schema }) => {
		// Check if schema contains currency-related fields
		const schemaObj = schema as { properties?: Record<string, unknown> }
		if (schemaObj.properties) {
			const hasCurrencyFields = Object.keys(schemaObj.properties).some(
				key =>
					key.includes('amount') ||
					key.includes('price') ||
					key.includes('rent') ||
					key.includes('cost') ||
					key === 'currency' ||
					key === 'revenue'
			)

			if (hasCurrencyFields) {
				return (data: unknown) => {
					return JSON.stringify(data, (key, value) => {
						// Apply currency serialization to relevant fields
						if (
							(key.includes('amount') ||
								key.includes('price') ||
								key.includes('rent') ||
								key.includes('cost') ||
								key === 'revenue') &&
							typeof value === 'number'
						) {
							return serializer.call(fastify, value)
						}

						// Handle currency amount objects
						if (
							value &&
							typeof value === 'object' &&
							'__isCurrency' in value
						) {
							return serializer.call(fastify, value)
						}

						return value as unknown
					})
				}
			}
		}

		return JSON.stringify
	})
=======
  fastify: FastifyInstance,
  options: CurrencySerializerOptions = {}
) {
  const serializer = createCurrencySerializer(options)
  
  fastify.setSerializerCompiler(({ schema }) => {
    // Check if schema contains currency-related fields
    if (schema && typeof schema === 'object' && 'properties' in schema) {
      const hasCurrencyFields = Object.keys(schema.properties || {}).some(key => 
        key.includes('amount') || 
        key.includes('price') || 
        key.includes('rent') || 
        key.includes('cost') ||
        key === 'currency' ||
        key === 'revenue'
      )
      
      if (hasCurrencyFields) {
        return (data: unknown) => {
          return JSON.stringify(data, (key, value) => {
            // Apply currency serialization to relevant fields
            if ((key.includes('amount') || key.includes('price') || 
                 key.includes('rent') || key.includes('cost') ||
                 key === 'revenue') && typeof value === 'number') {
              return serializer.call(fastify, value)
            }
            
            // Handle currency amount objects
            if (value && typeof value === 'object' && '__isCurrency' in value) {
              return serializer.call(fastify, value)
            }
            
            return value
          })
        }
      }
    }
    
    return JSON.stringify
  })
>>>>>>> origin/main
}

/**
 * Schema definitions for currency fields in OpenAPI
 */
export const CurrencyAmountSchema = {
<<<<<<< HEAD
	type: 'number',
	format: 'float',
	minimum: 0,
	example: 29.99,
	description: 'Currency amount in display format (dollars, not cents)'
} as const

export const StripeCentsAmountSchema = {
	type: 'integer',
	minimum: 0,
	example: 2999,
	description: 'Amount in cents as used by Stripe API'
=======
  type: 'number',
  format: 'float',
  minimum: 0,
  example: 29.99,
  description: 'Currency amount in display format (dollars, not cents)'
} as const

export const StripeCentsAmountSchema = {
  type: 'integer',
  minimum: 0,
  example: 2999,
  description: 'Amount in cents as used by Stripe API'
>>>>>>> origin/main
} as const

/**
 * Helper function to convert display amounts to Stripe cents
 * Use this when sending data to Stripe API
 */
export function toStripeCents(displayAmount: number): number {
<<<<<<< HEAD
	return Math.round(displayAmount * 100)
=======
  return Math.round(displayAmount * 100)
>>>>>>> origin/main
}

/**
 * Helper function to convert Stripe cents to display amount
 * Use this when receiving data from Stripe webhooks
 */
export function fromStripeCents(centsAmount: number): number {
<<<<<<< HEAD
	return Number((centsAmount / 100).toFixed(2))
=======
  return Number((centsAmount / 100).toFixed(2))
>>>>>>> origin/main
}

/**
 * Example schema for financial endpoints
 */
export const SubscriptionResponseSchema = {
<<<<<<< HEAD
	type: 'object',
	properties: {
		id: { type: 'string' },
		planId: { type: 'string' },
		status: { type: 'string' },
		currentAmount: CurrencyAmountSchema,
		nextAmount: CurrencyAmountSchema,
		currency: { type: 'string', example: 'USD' },
		currentPeriodEnd: {
			type: 'string',
			format: 'date-time',
			description: 'End of current billing period'
		}
	}
} as const
=======
  type: 'object',
  properties: {
    id: { type: 'string' },
    planId: { type: 'string' },
    status: { type: 'string' },
    currentAmount: CurrencyAmountSchema,
    nextAmount: CurrencyAmountSchema,
    currency: { type: 'string', example: 'USD' },
    currentPeriodEnd: {
      type: 'string',
      format: 'date-time',
      description: 'End of current billing period'
    }
  }
} as const
>>>>>>> origin/main
