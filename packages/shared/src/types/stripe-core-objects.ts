/**
 * Stripe Core Objects Type Definitions for TenantFlow
 * 
 * Enhanced type definitions for Customer, Price, Product, Invoice, and Customer Session objects
 * based on official Stripe API documentation.
 * 
 * These types are focused on the attributes TenantFlow actually uses in production.
 */

import type { SupportedCurrency, PaymentMethodType, StripeMetadata } from './stripe'

// ========================
// Customer Object Types
// ========================

export interface StripeAddress {
  readonly city?: string | null
  readonly country?: string | null
  readonly line1?: string | null
  readonly line2?: string | null
  readonly postal_code?: string | null
  readonly state?: string | null
}

export interface StripeCashBalance {
  readonly object: 'cash_balance'
  readonly available?: Record<string, number> | null
  readonly customer: string
  readonly livemode: boolean
  readonly settings: {
    readonly reconciliation_mode: 'automatic' | 'manual'
  }
}

export interface StripeInvoiceSettings {
  readonly custom_fields?: {
    readonly name: string
    readonly value: string
  }[] | null
  readonly default_payment_method?: string | null
  readonly footer?: string | null
  readonly rendering_options?: {
    readonly amount_tax_display?: 'exclude_tax' | 'include_inclusive_tax' | null
  } | null
}

export interface StripeShipping {
  readonly address?: StripeAddress | null
  readonly carrier?: string | null
  readonly name?: string | null
  readonly phone?: string | null
  readonly tracking_number?: string | null
}

export interface StripeTaxExempt {
  readonly exempt: 'exempt' | 'none' | 'reverse'
}

export interface StripeTaxId {
  readonly id: string
  readonly object: 'tax_id'
  readonly country?: string | null
  readonly created: number
  readonly customer?: string | null
  readonly livemode: boolean
  readonly type: 'ad_nrt' | 'ae_trn' | 'ar_cuit' | 'au_abn' | 'au_arn' | 'bg_uic' | 'bo_tin' | 'br_cnpj' | 'br_cpf' | 'ca_bn' | 'ca_gst_hst' | 'ca_pst_bc' | 'ca_pst_mb' | 'ca_pst_sk' | 'ca_qst' | 'ch_vat' | 'cl_tin' | 'cn_tin' | 'co_nit' | 'cr_tin' | 'do_rcn' | 'ec_ruc' | 'eg_tin' | 'es_cif' | 'eu_oss_vat' | 'eu_vat' | 'gb_vat' | 'ge_vat' | 'hk_br' | 'hu_tin' | 'id_npwp' | 'il_vat' | 'in_gst' | 'is_vat' | 'jp_cn' | 'jp_rn' | 'jp_trn' | 'ke_pin' | 'kr_brn' | 'li_uid' | 'mx_rfc' | 'my_frp' | 'my_itn' | 'my_sst' | 'no_vat' | 'nz_gst' | 'pe_ruc' | 'ph_tin' | 'ro_tin' | 'rs_pib' | 'ru_inn' | 'ru_kpp' | 'sa_vat' | 'sg_gst' | 'sg_uen' | 'si_tin' | 'sv_nit' | 'th_vat' | 'tr_tin' | 'tw_vat' | 'ua_vat' | 'us_ein' | 'uy_ruc' | 've_rif' | 'vn_tin' | 'za_vat'
  readonly value: string
  readonly verification?: {
    readonly status: 'pending' | 'unavailable' | 'unverified' | 'verified'
    readonly verified_address?: string | null
    readonly verified_name?: string | null
  } | null
}

/**
 * Main Customer object as used in TenantFlow
 */
export interface StripeCustomer {
  readonly id: string
  readonly object: 'customer'
  readonly address?: StripeAddress | null
  readonly balance?: number | null
  readonly cash_balance?: StripeCashBalance | null
  readonly created: number
  readonly currency?: SupportedCurrency | null
  /** @deprecated Use invoice_settings.default_payment_method instead. Sources API is deprecated. */
  readonly default_source?: string | null
  readonly delinquent?: boolean | null
  readonly description?: string | null
  readonly discount?: {
    readonly id: string
    readonly object: 'discount'
    readonly checkout_session?: string | null
    readonly coupon: {
      readonly id: string
      readonly object: 'coupon'
      readonly amount_off?: number | null
      readonly created: number
      readonly currency?: SupportedCurrency | null
      readonly duration: 'forever' | 'once' | 'repeating'
      readonly duration_in_months?: number | null
      readonly livemode: boolean
      readonly max_redemptions?: number | null
      readonly metadata: StripeMetadata
      readonly name?: string | null
      readonly percent_off?: number | null
      readonly redeem_by?: number | null
      readonly times_redeemed: number
      readonly valid: boolean
    }
    readonly customer?: string | null
    readonly end?: number | null
    readonly invoice?: string | null
    readonly invoice_item?: string | null
    readonly promotion_code?: string | null
    readonly start: number
    readonly subscription?: string | null
    readonly subscription_item?: string | null
  } | null
  readonly email?: string | null
  readonly invoice_prefix?: string | null
  readonly invoice_settings?: StripeInvoiceSettings | null
  readonly livemode: boolean
  readonly metadata: StripeMetadata
  readonly name?: string | null
  readonly next_invoice_sequence?: number | null
  readonly phone?: string | null
  readonly preferred_locales?: string[] | null
  readonly shipping?: StripeShipping | null
  readonly tax_exempt?: 'exempt' | 'none' | 'reverse' | null
  readonly tax_ids?: {
    readonly object: 'list'
    readonly data: StripeTaxId[]
    readonly has_more: boolean
    readonly url: string
  } | null
  readonly test_clock?: string | null
}

// ========================
// Price Object Types
// ========================

export const PRICE_BILLING_SCHEMES = {
  PER_UNIT: 'per_unit',
  TIERED: 'tiered'
} as const

export type PriceBillingScheme = typeof PRICE_BILLING_SCHEMES[keyof typeof PRICE_BILLING_SCHEMES]

export const PRICE_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring'
} as const

export type PriceType = typeof PRICE_TYPES[keyof typeof PRICE_TYPES]

export const RECURRING_INTERVALS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
} as const

export type RecurringInterval = typeof RECURRING_INTERVALS[keyof typeof RECURRING_INTERVALS]

export const RECURRING_USAGE_TYPES = {
  LICENSED: 'licensed',
  METERED: 'metered'
} as const

export type RecurringUsageType = typeof RECURRING_USAGE_TYPES[keyof typeof RECURRING_USAGE_TYPES]

export const AGGREGATE_USAGE_TYPES = {
  SUM: 'sum',
  LAST_DURING_PERIOD: 'last_during_period',
  LAST_EVER: 'last_ever',
  MAX: 'max'
} as const

export type AggregateUsageType = typeof AGGREGATE_USAGE_TYPES[keyof typeof AGGREGATE_USAGE_TYPES]

export const TAX_BEHAVIORS = {
  EXCLUSIVE: 'exclusive',
  INCLUSIVE: 'inclusive',
  UNSPECIFIED: 'unspecified'
} as const

export type TaxBehavior = typeof TAX_BEHAVIORS[keyof typeof TAX_BEHAVIORS]

export const TIERS_MODES = {
  GRADUATED: 'graduated',
  VOLUME: 'volume'
} as const

export type TiersMode = typeof TIERS_MODES[keyof typeof TIERS_MODES]

export interface PriceCustomUnitAmount {
  readonly maximum?: number | null
  readonly minimum?: number | null
  readonly preset?: number | null
}

export interface PriceRecurring {
  readonly aggregate_usage?: AggregateUsageType | null
  readonly interval: RecurringInterval
  readonly interval_count: number
  readonly meter?: string | null
  readonly trial_period_days?: number | null
  readonly usage_type: RecurringUsageType
}

export interface PriceTier {
  readonly flat_amount?: number | null
  readonly flat_amount_decimal?: string | null
  readonly unit_amount?: number | null
  readonly unit_amount_decimal?: string | null
  readonly up_to?: number | 'inf' | null
}

export interface PriceTransformQuantity {
  readonly divide_by: number
  readonly round: 'down' | 'up'
}

export interface PriceCurrencyOptions {
  readonly custom_unit_amount?: PriceCustomUnitAmount | null
  readonly tax_behavior?: TaxBehavior | null
  readonly tiers?: PriceTier[] | null
  readonly unit_amount?: number | null
  readonly unit_amount_decimal?: string | null
}

/**
 * Main Price object as used in TenantFlow
 */
export interface StripePrice {
  readonly id: string
  readonly object: 'price'
  readonly active: boolean
  readonly billing_scheme: PriceBillingScheme
  readonly created: number
  readonly currency: SupportedCurrency
  readonly currency_options?: Record<string, PriceCurrencyOptions> | null
  readonly custom_unit_amount?: PriceCustomUnitAmount | null
  readonly livemode: boolean
  readonly lookup_key?: string | null
  readonly metadata: StripeMetadata
  readonly nickname?: string | null
  readonly product: string
  readonly recurring?: PriceRecurring | null
  readonly tax_behavior?: TaxBehavior | null
  readonly tiers?: PriceTier[] | null
  readonly tiers_mode?: TiersMode | null
  readonly transform_quantity?: PriceTransformQuantity | null
  readonly type: PriceType
  readonly unit_amount?: number | null
  readonly unit_amount_decimal?: string | null
}

// ========================
// Product Object Types
// ========================

export interface ProductMarketingFeature {
  readonly name?: string | null
}

export interface ProductPackageDimensions {
  readonly height: number
  readonly length: number
  readonly weight: number
  readonly width: number
}

/**
 * Main Product object as used in TenantFlow
 */
export interface StripeProduct {
  readonly id: string
  readonly object: 'product'
  readonly active: boolean
  readonly attributes?: string[] | null
  readonly caption?: string | null
  readonly created: number
  readonly deactivate_on?: string[] | null
  readonly default_price?: string | null
  readonly description?: string | null
  readonly images: string[]
  readonly livemode: boolean
  readonly marketing_features: ProductMarketingFeature[]
  readonly metadata: StripeMetadata
  readonly name: string
  readonly package_dimensions?: ProductPackageDimensions | null
  readonly shippable?: boolean | null
  readonly statement_descriptor?: string | null
  readonly tax_code?: string | null
  readonly type?: 'good' | 'service' | null
  readonly unit_label?: string | null
  readonly updated: number
  readonly url?: string | null
}

// ========================
// Invoice Object Types
// ========================

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open',
  PAID: 'paid',
  UNCOLLECTIBLE: 'uncollectible',
  VOID: 'void'
} as const

export type InvoiceStatus = typeof INVOICE_STATUSES[keyof typeof INVOICE_STATUSES]

export const INVOICE_COLLECTION_METHODS = {
  CHARGE_AUTOMATICALLY: 'charge_automatically',
  SEND_INVOICE: 'send_invoice'
} as const

export type InvoiceCollectionMethod = typeof INVOICE_COLLECTION_METHODS[keyof typeof INVOICE_COLLECTION_METHODS]

export const INVOICE_BILLING_REASONS = {
  AUTOMATIC_PENDING_INVOICE_ITEM_INVOICE: 'automatic_pending_invoice_item_invoice',
  MANUAL: 'manual',
  QUOTE_ACCEPT: 'quote_accept',
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_CREATE: 'subscription_create',
  SUBSCRIPTION_CYCLE: 'subscription_cycle',
  SUBSCRIPTION_THRESHOLD: 'subscription_threshold',
  SUBSCRIPTION_UPDATE: 'subscription_update',
  UPCOMING: 'upcoming'
} as const

export type InvoiceBillingReason = typeof INVOICE_BILLING_REASONS[keyof typeof INVOICE_BILLING_REASONS]

export interface InvoiceAutomaticTax {
  readonly enabled: boolean
  readonly liability?: {
    readonly account?: string | null
    readonly type: 'account' | 'self'
  } | null
  readonly status?: 'complete' | 'failed' | 'requires_location_inputs' | null
}

export interface InvoiceCustomField {
  readonly name: string
  readonly value: string
}

export interface InvoiceFromInvoice {
  readonly action: string
  readonly invoice: string
}

export interface InvoicePaymentSettings {
  readonly default_mandate?: string | null
  readonly payment_method_options?: {
    readonly acss_debit?: {
      readonly mandate_options?: {
        readonly transaction_type?: 'business' | 'personal' | null
      } | null
      readonly verification_method?: 'automatic' | 'instant' | 'microdeposits' | null
    } | null
    readonly bancontact?: {
      readonly preferred_language?: 'de' | 'en' | 'fr' | 'nl' | null
    } | null
    readonly card?: {
      readonly installments?: {
        readonly enabled?: boolean | null
        readonly plan?: {
          readonly count: number
          readonly interval: 'month'
          readonly type: 'fixed_count'
        } | null
      } | null
      readonly mandate_options?: {
        readonly amount?: number | null
        readonly amount_type?: 'fixed' | 'maximum' | null
        readonly description?: string | null
      } | null
      readonly network?: string | null
      readonly request_three_d_secure?: 'any' | 'automatic' | 'challenge' | null
    } | null
    readonly customer_balance?: {
      readonly bank_transfer?: {
        readonly eu_bank_transfer?: {
          readonly country: string
        } | null
        readonly type?: string | null
      } | null
      readonly funding_type?: 'bank_transfer' | null
    } | null
    readonly konbini?: Record<string, never> | null
    readonly sepa_debit?: Record<string, never> | null
    readonly us_bank_account?: {
      readonly financial_connections?: {
        readonly filters?: {
          readonly account_subcategory?: ('checking' | 'savings')[] | null
        } | null
        readonly permissions?: ('balances' | 'ownership' | 'payment_method' | 'transactions')[] | null
        readonly prefetch?: ('balances' | 'ownership' | 'transactions')[] | null
      } | null
      readonly verification_method?: 'automatic' | 'instant' | 'microdeposits' | null
    } | null
  } | null
  readonly payment_method_types?: PaymentMethodType[] | null
}

export interface InvoiceStatusTransitions {
  readonly finalized_at?: number | null
  readonly marked_uncollectible_at?: number | null
  readonly paid_at?: number | null
  readonly voided_at?: number | null
}

export interface InvoiceThresholdReason {
  readonly amount_gte: number
  readonly item_reasons: {
    readonly line_item_ids: string[]
    readonly usage_gte: number
  }[]
}

export interface InvoiceTotalTaxAmount {
  readonly amount: number
  readonly inclusive: boolean
  readonly tax_rate: string
  readonly taxability_reason?: 'customer_exempt' | 'not_collecting' | 'not_subject_to_tax' | 'not_supported' | 'portion_product_exempt' | 'portion_reduced_rated' | 'portion_standard_rated' | 'product_exempt' | 'product_exempt_holiday' | 'proportionally_rated' | 'reduced_rated' | 'reverse_charge' | 'standard_rated' | 'taxable_basis_reduced' | 'zero_rated' | null
  readonly taxable_amount?: number | null
}

export interface InvoiceTransferData {
  readonly amount?: number | null
  readonly destination: string
}

/**
 * Main Invoice object as used in TenantFlow
 */
export interface StripeInvoice {
  readonly id: string
  readonly object: 'invoice'
  readonly account_country?: string | null
  readonly account_name?: string | null
  readonly account_tax_ids?: string[] | null
  readonly amount_due: number
  readonly amount_paid: number
  readonly amount_remaining: number
  readonly amount_shipping: number
  readonly application?: string | null
  readonly application_fee_amount?: number | null
  readonly attempt_count: number
  readonly attempted: boolean
  readonly auto_advance?: boolean | null
  readonly automatic_tax: InvoiceAutomaticTax
  readonly billing_reason?: InvoiceBillingReason | null
  readonly charge?: string | null
  readonly collection_method: InvoiceCollectionMethod
  readonly created: number
  readonly currency: SupportedCurrency
  readonly custom_fields?: InvoiceCustomField[] | null
  readonly customer?: string | null
  readonly customer_address?: StripeAddress | null
  readonly customer_email?: string | null
  readonly customer_name?: string | null
  readonly customer_phone?: string | null
  readonly customer_shipping?: StripeShipping | null
  readonly customer_tax_exempt?: 'exempt' | 'none' | 'reverse' | null
  readonly customer_tax_ids?: StripeTaxId[] | null
  readonly default_payment_method?: string | null
  /** @deprecated Use default_payment_method instead. Sources API is deprecated. */
  readonly default_source?: string | null
  readonly default_tax_rates: {
    readonly id: string
    readonly object: 'tax_rate'
    readonly active: boolean
    readonly country?: string | null
    readonly created: number
    readonly description?: string | null
    readonly display_name: string
    readonly effective_percentage?: number | null
    readonly inclusive: boolean
    readonly jurisdiction?: string | null
    readonly jurisdiction_level?: 'city' | 'country' | 'county' | 'district' | 'multiple' | 'state' | null
    readonly livemode: boolean
    readonly metadata: StripeMetadata
    readonly percentage: number
    readonly state?: string | null
    readonly tax_type?: 'amusement_tax' | 'communications_tax' | 'gst' | 'hst' | 'igst' | 'jct' | 'lease_tax' | 'pst' | 'qst' | 'rst' | 'sales_tax' | 'vat' | null
  }[]
  readonly description?: string | null
  readonly discount?: {
    readonly id: string
    readonly object: 'discount'
    readonly checkout_session?: string | null
    readonly coupon: {
      readonly id: string
      readonly object: 'coupon'
      readonly amount_off?: number | null
      readonly created: number
      readonly currency?: SupportedCurrency | null
      readonly duration: 'forever' | 'once' | 'repeating'
      readonly duration_in_months?: number | null
      readonly livemode: boolean
      readonly max_redemptions?: number | null
      readonly metadata: StripeMetadata
      readonly name?: string | null
      readonly percent_off?: number | null
      readonly redeem_by?: number | null
      readonly times_redeemed: number
      readonly valid: boolean
    }
    readonly customer?: string | null
    readonly end?: number | null
    readonly invoice?: string | null
    readonly invoice_item?: string | null
    readonly promotion_code?: string | null
    readonly start: number
    readonly subscription?: string | null
    readonly subscription_item?: string | null
  } | null
  readonly discounts?: string[] | null
  readonly due_date?: number | null
  readonly effective_at?: number | null
  readonly ending_balance?: number | null
  readonly footer?: string | null
  readonly from_invoice?: InvoiceFromInvoice | null
  readonly hosted_invoice_url?: string | null
  readonly invoice_pdf?: string | null
  readonly issuer?: {
    readonly account?: string | null
    readonly type: 'account' | 'self'
  } | null
  readonly last_finalization_error?: {
    readonly code?: string | null
    readonly message?: string | null
    readonly type: string
  } | null
  readonly latest_revision?: string | null
  readonly lines: {
    readonly object: 'list'
    readonly data: {
      readonly id: string
      readonly object: 'line_item'
      readonly amount: number
      readonly amount_excluding_tax?: number | null
      readonly currency: SupportedCurrency
      readonly description?: string | null
      readonly discount_amounts?: {
        readonly amount: number
        readonly discount: string
      }[] | null
      readonly discountable: boolean
      readonly discounts?: string[] | null
      readonly invoice_item?: string | null
      readonly livemode: boolean
      readonly metadata: StripeMetadata
      readonly period: {
        readonly end: number
        readonly start: number
      }
      readonly price?: StripePrice | null
      readonly proration: boolean
      readonly proration_details?: {
        readonly credited_items?: {
          readonly invoice: string
          readonly invoice_line_items: string[]
        } | null
      } | null
      readonly quantity?: number | null
      readonly subscription?: string | null
      readonly subscription_item?: string | null
      readonly tax_amounts?: {
        readonly amount: number
        readonly inclusive: boolean
        readonly tax_rate: string
        readonly taxability_reason?: string | null
        readonly taxable_amount?: number | null
      }[] | null
      readonly tax_rates?: {
        readonly id: string
        readonly object: 'tax_rate'
        readonly active: boolean
        readonly country?: string | null
        readonly created: number
        readonly description?: string | null
        readonly display_name: string
        readonly effective_percentage?: number | null
        readonly inclusive: boolean
        readonly jurisdiction?: string | null
        readonly jurisdiction_level?: 'city' | 'country' | 'county' | 'district' | 'multiple' | 'state' | null
        readonly livemode: boolean
        readonly metadata: StripeMetadata
        readonly percentage: number
        readonly state?: string | null
        readonly tax_type?: 'amusement_tax' | 'communications_tax' | 'gst' | 'hst' | 'igst' | 'jct' | 'lease_tax' | 'pst' | 'qst' | 'rst' | 'sales_tax' | 'vat' | null
      }[] | null
      readonly type: 'invoiceitem' | 'subscription'
      readonly unit_amount_excluding_tax?: string | null
    }[]
    readonly has_more: boolean
    readonly url: string
  }
  readonly livemode: boolean
  readonly metadata: StripeMetadata
  readonly next_payment_attempt?: number | null
  readonly number?: string | null
  readonly on_behalf_of?: string | null
  readonly paid: boolean
  readonly paid_out_of_band: boolean
  readonly payment_intent?: string | null
  readonly payment_settings: InvoicePaymentSettings
  readonly period_end: number
  readonly period_start: number
  readonly post_payment_credit_notes_amount: number
  readonly pre_payment_credit_notes_amount: number
  readonly quote?: string | null
  readonly receipt_number?: string | null
  readonly rendering?: {
    readonly amount_tax_display?: 'exclude_tax' | 'include_inclusive_tax' | null
    readonly pdf?: {
      readonly page_size?: 'a4' | 'auto' | 'letter' | null
    } | null
  } | null
  readonly shipping_cost?: {
    readonly amount_subtotal: number
    readonly amount_tax: number
    readonly amount_total: number
    readonly shipping_rate?: string | null
    readonly taxes?: {
      readonly amount: number
      readonly rate: string
      readonly taxability_reason?: string | null
      readonly taxable_amount?: number | null
    }[] | null
  } | null
  readonly shipping_details?: StripeShipping | null
  readonly starting_balance: number
  readonly statement_descriptor?: string | null
  readonly status: InvoiceStatus
  readonly status_transitions: InvoiceStatusTransitions
  readonly subscription?: string | null
  readonly subscription_details?: {
    readonly metadata?: StripeMetadata | null
  } | null
  readonly subtotal: number
  readonly subtotal_excluding_tax?: number | null
  readonly tax?: number | null
  readonly test_clock?: string | null
  readonly threshold_reason?: InvoiceThresholdReason | null
  readonly total: number
  readonly total_discount_amounts?: {
    readonly amount: number
    readonly discount: string
  }[] | null
  readonly total_excluding_tax?: number | null
  readonly total_tax_amounts: InvoiceTotalTaxAmount[]
  readonly transfer_data?: InvoiceTransferData | null
  readonly webhooks_delivered_at?: number | null
}

// ========================
// Customer Session Object Types
// ========================

export interface CustomerSessionBuyButton {
  readonly enabled: boolean
}

export interface CustomerSessionPricingTable {
  readonly enabled: boolean
}

export interface CustomerSessionPaymentElementFeatures {
  readonly payment_method_allow_redisplay_filters?: ('always' | 'limited' | 'unspecified')[] | null
  readonly payment_method_redisplay?: 'disabled' | 'enabled' | null
  readonly payment_method_redisplay_limit?: number | null
  readonly payment_method_remove?: 'disabled' | 'enabled' | null
  readonly payment_method_save?: 'disabled' | 'enabled' | null
  readonly payment_method_save_usage?: 'off_session' | 'on_session' | null
}

export interface CustomerSessionPaymentElement {
  readonly enabled: boolean
  readonly features?: CustomerSessionPaymentElementFeatures | null
}

export interface CustomerSessionComponents {
  readonly buy_button?: CustomerSessionBuyButton | null
  readonly payment_element?: CustomerSessionPaymentElement | null
  readonly pricing_table?: CustomerSessionPricingTable | null
}

/**
 * Customer Session object for client-side operations
 */
export interface StripeCustomerSession {
  readonly object: 'customer_session'
  readonly client_secret: string
  readonly components: CustomerSessionComponents
  readonly created: number
  readonly customer: string
  readonly expires_at: number
  readonly livemode: boolean
}

// ========================
// Utility Functions
// ========================

/**
 * Type guards for Customer objects
 */
export function isStripeCustomer(obj: unknown): obj is StripeCustomer {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'customer' && 
         'id' in obj && typeof obj.id === 'string'
}

/**
 * Type guards for Price objects
 */
export function isStripePrice(obj: unknown): obj is StripePrice {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'price' && 
         'id' in obj && typeof obj.id === 'string'
}

/**
 * Type guards for Product objects
 */
export function isStripeProduct(obj: unknown): obj is StripeProduct {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'product' && 
         'id' in obj && typeof obj.id === 'string'
}

/**
 * Type guards for Invoice objects
 */
export function isStripeInvoice(obj: unknown): obj is StripeInvoice {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'invoice' && 
         'id' in obj && typeof obj.id === 'string'
}

/**
 * Type guards for Customer Session objects
 */
export function isStripeCustomerSession(obj: unknown): obj is StripeCustomerSession {
  return obj !== null && typeof obj === 'object' && 
         'object' in obj && obj.object === 'customer_session' && 
         'client_secret' in obj && typeof obj.client_secret === 'string'
}

/**
 * Extract plan type from price metadata or lookup key
 */
export function extractPlanTypeFromPrice(price: StripePrice): string | null {
  // First check metadata
  if (price.metadata.tenantflow_plan_type) {
    return price.metadata.tenantflow_plan_type
  }

  // Check lookup key for plan type
  if (price.lookup_key) {
    const key = price.lookup_key.toLowerCase()
    if (key.includes('starter')) return 'STARTER'
    if (key.includes('growth')) return 'GROWTH'
    if (key.includes('max') || key.includes('enterprise')) return 'TENANTFLOW_MAX'
    if (key.includes('trial') || key.includes('free')) return 'FREETRIAL'
  }

  return null
}

/**
 * Get price in dollars from cents
 */
export function getPriceInDollars(price: StripePrice): number | null {
  if (price.unit_amount === null || price.unit_amount === undefined) return null
  return price.unit_amount / 100
}

/**
 * Check if price is recurring
 */
export function isPriceRecurring(price: StripePrice): boolean {
  return price.type === 'recurring' && price.recurring !== null
}

/**
 * Get billing period from recurring price
 */
export function getBillingPeriod(price: StripePrice): string | null {
  if (!price.recurring) return null
  
  const { interval, interval_count } = price.recurring
  
  if (interval_count === 1) {
    return interval === 'month' ? 'monthly' : interval === 'year' ? 'annual' : interval
  }
  
  return `every_${interval_count}_${interval}s`
}

/**
 * Check if invoice is paid
 */
export function isInvoicePaid(invoice: StripeInvoice): boolean {
  return invoice.status === 'paid' && invoice.paid === true
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(invoice: StripeInvoice): boolean {
  if (!invoice.due_date) return false
  return Date.now() / 1000 > invoice.due_date && invoice.status === 'open'
}

/**
 * Get customer's primary email
 */
export function getCustomerEmail(customer: StripeCustomer): string | null {
  return customer.email || null
}

/**
 * Get customer's display name
 */
export function getCustomerDisplayName(customer: StripeCustomer): string {
  return customer.name || customer.email || `Customer ${customer.id.slice(-6)}`
}