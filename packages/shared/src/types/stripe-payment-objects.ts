/**
 * Stripe Payment Objects Type Definitions for TenantFlow
 *
 * Type definitions for Payment Methods, Checkout Sessions, Customer Portal Sessions,
 * Payment Intents, and Setup Intents based on official Stripe API documentation.
 *
 * These types cover the payment processing objects TenantFlow actively uses.
 */

import type {
	SupportedCurrency,
	StripeMetadata,
	StripeSubscription,
	WebhookEventType
} from './stripe'
import {
	WEBHOOK_EVENT_TYPES
} from './stripe'
import type {
	StripeAddress,
	StripePrice,
	StripeInvoice
} from './stripe-core-objects'

// ========================
// Payment Method Types
// ========================

export const PAYMENT_METHOD_TYPES = {
	// Cards
	CARD: 'card',

	// Bank Transfers
	US_BANK_ACCOUNT: 'us_bank_account',
	SEPA_DEBIT: 'sepa_debit',
	BACS_DEBIT: 'bacs_debit',
	AU_BECS_DEBIT: 'au_becs_debit',
	ACSS_DEBIT: 'acss_debit',

	// Digital Wallets
	ALIPAY: 'alipay',
	WECHAT_PAY: 'wechat_pay',

	// Buy Now Pay Later
	KLARNA: 'klarna',
	AFTERPAY_CLEARPAY: 'afterpay_clearpay',

	// European Methods
	BANCONTACT: 'bancontact',
	EPS: 'eps',
	GIROPAY: 'giropay',
	IDEAL: 'ideal',
	P24: 'p24',
	SOFORT: 'sofort'
} as const

export type PaymentMethodType =
	(typeof PAYMENT_METHOD_TYPES)[keyof typeof PAYMENT_METHOD_TYPES]

export const CARD_BRANDS = {
	AMEX: 'amex',
	DINERS: 'diners',
	DISCOVER: 'discover',
	ELO: 'elo',
	JCB: 'jcb',
	MASTERCARD: 'mastercard',
	UNIONPAY: 'unionpay',
	UNKNOWN: 'unknown',
	VISA: 'visa'
} as const

export type CardBrand = (typeof CARD_BRANDS)[keyof typeof CARD_BRANDS]

export const CARD_FUNDING_TYPES = {
	CREDIT: 'credit',
	DEBIT: 'debit',
	PREPAID: 'prepaid',
	UNKNOWN: 'unknown'
} as const

export type CardFundingType =
	(typeof CARD_FUNDING_TYPES)[keyof typeof CARD_FUNDING_TYPES]

export interface PaymentMethodBillingDetails {
	readonly address?: StripeAddress | null
	readonly email?: string | null
	readonly name?: string | null
	readonly phone?: string | null
}

export interface PaymentMethodCard {
	readonly brand: CardBrand
	readonly checks: {
		readonly address_line1_check?: string | null
		readonly address_postal_code_check?: string | null
		readonly cvc_check?: string | null
	}
	readonly country: string
	readonly description?: string | null
	readonly exp_month: number
	readonly exp_year: number
	readonly fingerprint?: string | null
	readonly funding: CardFundingType
	readonly generated_from?: {
		readonly charge?: string | null
		readonly payment_method_details?: {
			readonly card_present?: {
				readonly receipt?: {
					readonly account_type?: string | null
					readonly application_cryptogram?: string | null
					readonly application_preferred_name?: string | null
					readonly authorization_code?: string | null
					readonly authorization_response_code?: string | null
					readonly cardholder_verification_method?: string | null
					readonly dedicated_file_name?: string | null
					readonly terminal_verification_results?: string | null
					readonly transaction_status_information?: string | null
				} | null
			} | null
		} | null
		readonly setup_attempt?: string | null
	} | null
	readonly iin?: string | null
	readonly issuer?: string | null
	readonly last4: string
	readonly networks?: {
		readonly available: string[]
		readonly preferred?: string | null
	} | null
	readonly three_d_secure_usage?: {
		readonly supported: boolean
	} | null
	readonly wallet?: {
		readonly amex_express_checkout?: Record<string, never> | null
		readonly apple_pay?: Record<string, never> | null
		readonly dynamic_last4?: string | null
		readonly google_pay?: Record<string, never> | null
		readonly link?: Record<string, never> | null
		readonly masterpass?: {
			readonly billing_address?: StripeAddress | null
			readonly email?: string | null
			readonly name?: string | null
			readonly shipping_address?: StripeAddress | null
		} | null
		readonly samsung_pay?: Record<string, never> | null
		readonly type:
			| 'amex_express_checkout'
			| 'apple_pay'
			| 'google_pay'
			| 'link'
			| 'masterpass'
			| 'samsung_pay'
			| 'visa_checkout'
		readonly visa_checkout?: {
			readonly billing_address?: StripeAddress | null
			readonly email?: string | null
			readonly name?: string | null
			readonly shipping_address?: StripeAddress | null
		} | null
	} | null
}

export interface PaymentMethodUSBankAccount {
	readonly account_holder_type?: 'company' | 'individual' | null
	readonly account_type?: 'checking' | 'savings' | null
	readonly bank_name?: string | null
	readonly fingerprint?: string | null
	readonly last4: string
	readonly networks: {
		readonly preferred?: string | null
		readonly supported: string[]
	}
	readonly routing_number: string
	readonly status_details?: {
		readonly blocked?: {
			readonly network_code?: string | null
			readonly reason?: string | null
		} | null
	} | null
}

/**
 * Main Payment Method object as used in TenantFlow
 */
export interface StripePaymentMethod {
	readonly id: string
	readonly object: 'payment_method'
	readonly allow_redisplay?: 'always' | 'limited' | 'unspecified' | null
	readonly billing_details: PaymentMethodBillingDetails
	readonly card?: PaymentMethodCard | null
	readonly created: number
	readonly customer?: string | null
	readonly livemode: boolean
	readonly metadata: StripeMetadata
	readonly type: PaymentMethodType
	readonly us_bank_account?: PaymentMethodUSBankAccount | null
}

// ========================
// Checkout Session Types
// ========================

export const CHECKOUT_MODES = {
	PAYMENT: 'payment',
	SETUP: 'setup',
	SUBSCRIPTION: 'subscription'
} as const

export type CheckoutMode = (typeof CHECKOUT_MODES)[keyof typeof CHECKOUT_MODES]

export const PAYMENT_STATUSES = {
	NO_PAYMENT_REQUIRED: 'no_payment_required',
	PAID: 'paid',
	UNPAID: 'unpaid'
} as const

export type PaymentStatus =
	(typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]

export const BILLING_ADDRESS_COLLECTIONS = {
	AUTO: 'auto',
	REQUIRED: 'required'
} as const

export type BillingAddressCollection =
	(typeof BILLING_ADDRESS_COLLECTIONS)[keyof typeof BILLING_ADDRESS_COLLECTIONS]

export const SUBMIT_TYPES = {
	AUTO: 'auto',
	BOOK: 'book',
	DONATE: 'donate',
	PAY: 'pay'
} as const

export type SubmitType = (typeof SUBMIT_TYPES)[keyof typeof SUBMIT_TYPES]

export interface CheckoutSessionLineItem {
	readonly id: string
	readonly object: 'item'
	readonly adjustable_quantity?: {
		readonly enabled: boolean
		readonly maximum?: number | null
		readonly minimum?: number | null
	} | null
	readonly amount_discount: number
	readonly amount_subtotal: number
	readonly amount_tax: number
	readonly amount_total: number
	readonly currency: SupportedCurrency
	readonly description: string
	readonly discounts?:
		| {
				readonly amount: number
				readonly discount: {
					readonly id: string
					readonly object: 'discount'
					// Additional discount properties
				}
		  }[]
		| null
	readonly price?: StripePrice | null
	readonly quantity?: number | null
	readonly taxes?:
		| {
				readonly amount: number
				readonly rate: {
					readonly id: string
					readonly object: 'tax_rate'
					// Additional tax rate properties
				}
		  }[]
		| null
}

export interface CheckoutSessionCustomerDetails {
	readonly address?: StripeAddress | null
	readonly email?: string | null
	readonly name?: string | null
	readonly phone?: string | null
	readonly tax_exempt?: 'exempt' | 'none' | 'reverse' | null
	readonly tax_ids?:
		| {
				readonly type: string
				readonly value: string
		  }[]
		| null
}

export interface CheckoutSessionShippingCost {
	readonly amount_subtotal: number
	readonly amount_tax: number
	readonly amount_total: number
	readonly shipping_rate?: string | null
	readonly taxes?:
		| {
				readonly amount: number
				readonly rate: string
				readonly taxability_reason?: string | null
				readonly taxable_amount?: number | null
		  }[]
		| null
}

export interface CheckoutSessionAutomaticTax {
	readonly enabled: boolean
	readonly liability?: {
		readonly account?: string | null
		readonly type: 'account' | 'self'
	} | null
	readonly status?: 'complete' | 'failed' | 'requires_location_inputs' | null
}

/**
 * Main Checkout Session object as used in TenantFlow
 */
export interface StripeCheckoutSession {
	readonly id: string
	readonly object: 'checkout.session'
	readonly after_expiration?: {
		readonly recovery?: {
			readonly allow_promotion_codes?: boolean | null
			readonly enabled: boolean
			readonly expires_at?: number | null
			readonly url?: string | null
		} | null
	} | null
	readonly allow_promotion_codes?: boolean | null
	readonly amount_subtotal?: number | null
	readonly amount_total?: number | null
	readonly automatic_tax: CheckoutSessionAutomaticTax
	readonly billing_address_collection?: BillingAddressCollection | null
	readonly cancel_url?: string | null
	readonly client_reference_id?: string | null
	readonly client_secret?: string | null
	readonly consent?: {
		readonly promotions?: 'opt_in' | 'opt_out' | null
		readonly terms_of_service?: 'accepted' | null
	} | null
	readonly consent_collection?: {
		readonly payment_method_reuse_agreement?: {
			readonly position: 'auto' | 'hidden'
		} | null
		readonly promotions?: 'auto' | 'none' | null
		readonly terms_of_service?: 'none' | 'required' | null
	} | null
	readonly created: number
	readonly currency?: SupportedCurrency | null
	readonly currency_conversion?: {
		readonly amount_subtotal: number
		readonly amount_total: number
		readonly fx_rate: string
		readonly source_currency: SupportedCurrency
	} | null
	readonly custom_fields?:
		| {
				readonly dropdown?: {
					readonly options: {
						readonly label: string
						readonly value: string
					}[]
					readonly value?: string | null
				} | null
				readonly key: string
				readonly label: {
					readonly custom?: string | null
					readonly type: 'custom'
				}
				readonly numeric?: {
					readonly maximum_length?: number | null
					readonly minimum_length?: number | null
					readonly value?: string | null
				} | null
				readonly optional: boolean
				readonly text?: {
					readonly maximum_length?: number | null
					readonly minimum_length?: number | null
					readonly value?: string | null
				} | null
				readonly type: 'dropdown' | 'numeric' | 'text'
		  }[]
		| null
	readonly custom_text?: {
		readonly after_submit?: {
			readonly message?: string | null
		} | null
		readonly shipping_address?: {
			readonly message?: string | null
		} | null
		readonly submit?: {
			readonly message?: string | null
		} | null
		readonly terms_of_service_acceptance?: {
			readonly message?: string | null
		} | null
	} | null
	readonly customer?: string | null
	readonly customer_creation?: 'always' | 'if_required' | null
	readonly customer_details?: CheckoutSessionCustomerDetails | null
	readonly customer_email?: string | null
	readonly expires_at: number
	readonly invoice?: string | null
	readonly invoice_creation?: {
		readonly enabled: boolean
		readonly invoice_data?: {
			readonly account_tax_ids?: string[] | null
			readonly custom_fields?:
				| {
						readonly name: string
						readonly value: string
				  }[]
				| null
			readonly description?: string | null
			readonly footer?: string | null
			readonly issuer?: {
				readonly account?: string | null
				readonly type: 'account' | 'self'
			} | null
			readonly metadata?: StripeMetadata | null
			readonly rendering_options?: {
				readonly amount_tax_display?:
					| 'exclude_tax'
					| 'include_inclusive_tax'
					| null
			} | null
		} | null
	} | null
	readonly line_items?: {
		readonly object: 'list'
		readonly data: CheckoutSessionLineItem[]
		readonly has_more: boolean
		readonly url: string
	} | null
	readonly livemode: boolean
	readonly locale?: string | null
	readonly metadata: StripeMetadata
	readonly mode: CheckoutMode
	readonly payment_intent?: string | null
	readonly payment_link?: string | null
	readonly payment_method_collection?: 'always' | 'if_required' | null
	readonly payment_method_configuration_details?: {
		readonly id: string
		readonly parent?: string | null
	} | null
	readonly payment_method_options?: Record<string, unknown> | null
	readonly payment_method_types: PaymentMethodType[]
	readonly payment_status: PaymentStatus
	readonly phone_number_collection?: {
		readonly enabled: boolean
	} | null
	readonly recovered_from?: string | null
	readonly redirect_on_completion?: 'always' | 'if_required' | 'never' | null
	readonly return_url?: string | null
	readonly setup_intent?: string | null
	readonly shipping_address_collection?: {
		readonly allowed_countries: string[]
	} | null
	readonly shipping_cost?: CheckoutSessionShippingCost | null
	readonly shipping_details?: {
		readonly address: StripeAddress
		readonly carrier?: string | null
		readonly name: string
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly shipping_options?:
		| {
				readonly shipping_amount: number
				readonly shipping_rate: string
		  }[]
		| null
	readonly status?: 'complete' | 'expired' | 'open' | null
	readonly submit_type?: SubmitType | null
	readonly subscription?: string | null
	readonly success_url: string
	readonly tax_id_collection?: {
		readonly enabled: boolean
		readonly required?: 'if_supported' | 'never' | null
	} | null
	readonly total_details?: {
		readonly amount_discount: number
		readonly amount_shipping?: number | null
		readonly amount_tax: number
		readonly breakdown?: {
			readonly discounts: {
				readonly amount: number
				readonly discount: {
					readonly id: string
					readonly object: 'discount'
					// Additional discount properties
				}
			}[]
			readonly taxes: {
				readonly amount: number
				readonly rate: {
					readonly id: string
					readonly object: 'tax_rate'
					// Additional tax rate properties
				}
				readonly taxability_reason?: string | null
				readonly taxable_amount?: number | null
			}[]
		} | null
	} | null
	readonly ui_mode?: 'embedded' | 'hosted' | null
	readonly url?: string | null
}

// ========================
// Customer Portal Session Types
// ========================

export const PORTAL_FLOW_TYPES = {
	PAYMENT_METHOD_UPDATE: 'payment_method_update',
	SUBSCRIPTION_CANCEL: 'subscription_cancel',
	SUBSCRIPTION_UPDATE: 'subscription_update',
	SUBSCRIPTION_UPDATE_CONFIRM: 'subscription_update_confirm'
} as const

export type PortalFlowType =
	(typeof PORTAL_FLOW_TYPES)[keyof typeof PORTAL_FLOW_TYPES]

export interface PortalFlowAfterCompletion {
	readonly type: 'hosted_confirmation' | 'redirect'
	readonly hosted_confirmation?: {
		readonly custom_message?: string | null
	} | null
	readonly redirect?: {
		readonly return_url: string
	} | null
}

export interface PortalFlow {
	readonly type: PortalFlowType
	readonly after_completion: PortalFlowAfterCompletion
	readonly subscription_cancel?: {
		readonly retention?: {
			readonly coupon_offer: {
				readonly coupon: string
			}
		} | null
		readonly subscription: string
	} | null
	readonly subscription_update?: {
		readonly subscription: string
	} | null
	readonly subscription_update_confirm?: {
		readonly discounts?:
			| {
					readonly coupon?: string | null
					readonly promotion_code?: string | null
			  }[]
			| null
		readonly items: {
			readonly id: string
			readonly price?: string | null
			readonly quantity?: number | null
		}[]
		readonly subscription: string
	} | null
}

/**
 * Main Customer Portal Session object as used in TenantFlow
 */
export interface StripeCustomerPortalSession {
	readonly id: string
	readonly object: 'billing_portal.session'
	readonly configuration: string
	readonly created: number
	readonly customer: string
	readonly flow?: PortalFlow | null
	readonly livemode: boolean
	readonly locale?: string | null
	readonly on_behalf_of?: string | null
	readonly return_url?: string | null
	readonly url: string
}

// ========================
// Payment Intent Types
// ========================

export const PAYMENT_INTENT_STATUSES = {
	REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
	REQUIRES_CONFIRMATION: 'requires_confirmation',
	REQUIRES_ACTION: 'requires_action',
	PROCESSING: 'processing',
	REQUIRES_CAPTURE: 'requires_capture',
	CANCELED: 'canceled',
	SUCCEEDED: 'succeeded'
} as const

export type PaymentIntentStatus =
	(typeof PAYMENT_INTENT_STATUSES)[keyof typeof PAYMENT_INTENT_STATUSES]

export const CONFIRMATION_METHODS = {
	AUTOMATIC: 'automatic',
	MANUAL: 'manual'
} as const

export type ConfirmationMethod =
	(typeof CONFIRMATION_METHODS)[keyof typeof CONFIRMATION_METHODS]

export const CAPTURE_METHODS = {
	AUTOMATIC: 'automatic',
	AUTOMATIC_ASYNC: 'automatic_async',
	MANUAL: 'manual'
} as const

export type CaptureMethod =
	(typeof CAPTURE_METHODS)[keyof typeof CAPTURE_METHODS]

export const PAYMENT_INTENT_CANCELLATION_REASONS = {
	ABANDONED: 'abandoned',
	DUPLICATE: 'duplicate',
	FRAUDULENT: 'fraudulent',
	REQUESTED_BY_CUSTOMER: 'requested_by_customer',
	VOID_INVOICE: 'void_invoice'
} as const

export type PaymentIntentCancellationReason =
	(typeof PAYMENT_INTENT_CANCELLATION_REASONS)[keyof typeof PAYMENT_INTENT_CANCELLATION_REASONS]

export interface PaymentIntentNextAction {
	readonly type: string
	readonly alipay_handle_redirect?: {
		readonly native_data?: string | null
		readonly native_url?: string | null
		readonly return_url?: string | null
		readonly url?: string | null
	} | null
	readonly boleto_display_details?: {
		readonly expires_at?: number | null
		readonly hosted_voucher_url?: string | null
		readonly number?: string | null
		readonly pdf?: string | null
	} | null
	readonly card_await_notification?: {
		readonly charge_attempt_at?: number | null
		readonly customer_approval_url?: string | null
	} | null
	readonly cashapp_handle_redirect_or_display_qr_code?: {
		readonly hosted_instructions_url: string
		readonly mobile_auth_url: string
		readonly qr_code: {
			readonly expires_at: number
			readonly image_url_png: string
			readonly image_url_svg: string
		}
	} | null
	readonly display_bank_transfer_instructions?: {
		readonly amount_remaining?: number | null
		readonly currency?: string | null
		readonly financial_addresses?:
			| {
					readonly aba?: {
						readonly account_number: string
						readonly bank_name: string
						readonly routing_number: string
					} | null
					readonly iban?: {
						readonly account_holder_name: string
						readonly bic: string
						readonly country: string
						readonly iban: string
					} | null
					readonly sort_code?: {
						readonly account_holder_name: string
						readonly account_number: string
						readonly sort_code: string
					} | null
					readonly spei?: {
						readonly bank_code: string
						readonly bank_name: string
						readonly clabe: string
					} | null
					readonly supported_networks?: string[] | null
					readonly swift?: {
						readonly account_number: string
						readonly bank_name: string
						readonly swift_code: string
					} | null
					readonly type:
						| 'aba'
						| 'iban'
						| 'sort_code'
						| 'spei'
						| 'swift'
						| 'zengin'
					readonly zengin?: {
						readonly account_holder_name?: string | null
						readonly account_number?: string | null
						readonly account_type?: string | null
						readonly bank_code?: string | null
						readonly bank_name?: string | null
						readonly branch_code?: string | null
						readonly branch_name?: string | null
					} | null
			  }[]
			| null
		readonly hosted_instructions_url?: string | null
		readonly reference?: string | null
		readonly type:
			| 'eu_bank_transfer'
			| 'gb_bank_transfer'
			| 'jp_bank_transfer'
			| 'mx_bank_transfer'
			| 'us_bank_transfer'
	} | null
	readonly konbini_display_details?: {
		readonly expires_at: number
		readonly hosted_voucher_url: string
		readonly stores: {
			readonly familymart?: {
				readonly confirmation_number: string
				readonly payment_code: string
			} | null
			readonly lawson?: {
				readonly confirmation_number: string
				readonly payment_code: string
			} | null
			readonly ministop?: {
				readonly confirmation_number: string
				readonly payment_code: string
			} | null
			readonly seicomart?: {
				readonly confirmation_number: string
				readonly payment_code: string
			} | null
		}
	} | null
	readonly multibanco_display_details?: {
		readonly entity?: string | null
		readonly expires_at?: number | null
		readonly hosted_voucher_url?: string | null
		readonly reference?: string | null
	} | null
	readonly oxxo_display_details?: {
		readonly expires_after?: number | null
		readonly hosted_voucher_url?: string | null
		readonly number?: string | null
	} | null
	readonly paynow_display_qr_code?: {
		readonly data: string
		readonly hosted_instructions_url: string
		readonly image_url_png: string
		readonly image_url_svg: string
	} | null
	readonly pix_display_qr_code?: {
		readonly data?: string | null
		readonly expires_at?: number | null
		readonly hosted_instructions_url?: string | null
		readonly image_url_png?: string | null
		readonly image_url_svg?: string | null
	} | null
	readonly promptpay_display_qr_code?: {
		readonly data: string
		readonly hosted_instructions_url: string
		readonly image_url_png: string
		readonly image_url_svg: string
	} | null
	readonly redirect_to_url?: {
		readonly return_url?: string | null
		readonly url?: string | null
	} | null
	readonly swish_handle_redirect_or_display_qr_code?: {
		readonly hosted_instructions_url: string
		readonly qr_code: {
			readonly expires_at: number
			readonly image_url_png: string
			readonly image_url_svg: string
		}
	} | null
	readonly use_stripe_sdk?: Record<string, unknown> | null
	readonly verify_with_microdeposits?: {
		readonly arrival_date: number
		readonly hosted_verification_url: string
		readonly microdeposit_type?: 'amounts' | 'descriptor_code' | null
	} | null
	readonly wechat_pay_display_qr_code?: {
		readonly data: string
		readonly hosted_instructions_url: string
		readonly image_url_png: string
		readonly image_url_svg: string
	} | null
	readonly wechat_pay_redirect_to_android_app?: {
		readonly app_url: string
	} | null
	readonly wechat_pay_redirect_to_ios_app?: {
		readonly native_url: string
	} | null
}

/**
 * Main Payment Intent object as used in TenantFlow
 */
export interface StripePaymentIntent {
	readonly id: string
	readonly object: 'payment_intent'
	readonly amount: number
	readonly amount_capturable: number
	readonly amount_details?: {
		readonly tip?: Record<string, number> | null
	} | null
	readonly amount_received: number
	readonly application?: string | null
	readonly application_fee_amount?: number | null
	readonly automatic_payment_methods?: {
		readonly allow_redirects?: 'always' | 'never' | null
		readonly enabled: boolean
	} | null
	readonly canceled_at?: number | null
	readonly cancellation_reason?: PaymentIntentCancellationReason | null
	readonly capture_method: CaptureMethod
	readonly charges: {
		readonly object: 'list'
		readonly data: {
			readonly id: string
			readonly object: 'charge'
			// Additional charge properties
		}[]
		readonly has_more: boolean
		readonly url: string
	}
	readonly client_secret?: string | null
	readonly confirmation_method: ConfirmationMethod
	readonly created: number
	readonly currency: SupportedCurrency
	readonly customer?: string | null
	readonly description?: string | null
	readonly invoice?: string | null
	readonly last_payment_error?: {
		readonly charge?: string | null
		readonly code?: string | null
		readonly decline_code?: string | null
		readonly doc_url?: string | null
		readonly message?: string | null
		readonly param?: string | null
		readonly payment_intent?: string | null
		readonly payment_method?: {
			readonly id: string
			readonly object: 'payment_method'
			// Additional payment method properties
		} | null
		readonly payment_method_type?: string | null
		readonly request_log_url?: string | null
		readonly setup_intent?: string | null
		readonly source?: string | null
		readonly type: string
	} | null
	readonly latest_charge?: string | null
	readonly livemode: boolean
	readonly metadata: StripeMetadata
	readonly next_action?: PaymentIntentNextAction | null
	readonly on_behalf_of?: string | null
	readonly payment_method?: string | null
	readonly payment_method_configuration_details?: {
		readonly id: string
		readonly parent?: string | null
	} | null
	readonly payment_method_options?: Record<string, unknown> | null
	readonly payment_method_types: PaymentMethodType[]
	readonly processing?: {
		readonly card?: {
			readonly customer_notification?: {
				readonly approval_requested?: boolean | null
				readonly completes_at?: number | null
			} | null
		} | null
		readonly type: 'card'
	} | null
	readonly receipt_email?: string | null
	readonly review?: string | null
	readonly setup_future_usage?: 'off_session' | 'on_session' | null
	readonly shipping?: {
		readonly address: StripeAddress
		readonly carrier?: string | null
		readonly name: string
		readonly phone?: string | null
		readonly tracking_number?: string | null
	} | null
	readonly source?: string | null
	readonly statement_descriptor?: string | null
	readonly statement_descriptor_suffix?: string | null
	readonly status: PaymentIntentStatus
	readonly transfer_data?: {
		readonly amount?: number | null
		readonly destination: string
	} | null
	readonly transfer_group?: string | null
}

// ========================
// Setup Intent Types
// ========================

export const SETUP_INTENT_STATUSES = {
	REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
	REQUIRES_CONFIRMATION: 'requires_confirmation',
	REQUIRES_ACTION: 'requires_action',
	PROCESSING: 'processing',
	CANCELED: 'canceled',
	SUCCEEDED: 'succeeded'
} as const

export type SetupIntentStatus =
	(typeof SETUP_INTENT_STATUSES)[keyof typeof SETUP_INTENT_STATUSES]

export const USAGE_TYPES = {
	ON_SESSION: 'on_session',
	OFF_SESSION: 'off_session'
} as const

export type UsageType = (typeof USAGE_TYPES)[keyof typeof USAGE_TYPES]

export const SETUP_INTENT_CANCELLATION_REASONS = {
	ABANDONED: 'abandoned',
	DUPLICATE: 'duplicate',
	REQUESTED_BY_CUSTOMER: 'requested_by_customer'
} as const

export type SetupIntentCancellationReason =
	(typeof SETUP_INTENT_CANCELLATION_REASONS)[keyof typeof SETUP_INTENT_CANCELLATION_REASONS]

/**
 * Main Setup Intent object as used in TenantFlow
 */
export interface StripeSetupIntent {
	readonly id: string
	readonly object: 'setup_intent'
	readonly application?: string | null
	readonly attach_to_self?: boolean | null
	readonly automatic_payment_methods?: {
		readonly allow_redirects?: 'always' | 'never' | null
		readonly enabled: boolean
	} | null
	readonly canceled_at?: number | null
	readonly cancellation_reason?: SetupIntentCancellationReason | null
	readonly client_secret?: string | null
	readonly created: number
	readonly customer?: string | null
	readonly description?: string | null
	readonly flow_directions?: ('inbound' | 'outbound')[] | null
	readonly last_setup_error?: {
		readonly code?: string | null
		readonly decline_code?: string | null
		readonly doc_url?: string | null
		readonly message?: string | null
		readonly param?: string | null
		readonly payment_method?: {
			readonly id: string
			readonly object: 'payment_method'
			// Additional payment method properties
		} | null
		readonly payment_method_type?: string | null
		readonly request_log_url?: string | null
		readonly setup_intent?: string | null
		readonly source?: string | null
		readonly type: string
	} | null
	readonly latest_attempt?: string | null
	readonly livemode: boolean
	readonly mandate?: string | null
	readonly metadata: StripeMetadata
	readonly next_action?: {
		readonly cashapp_handle_redirect_or_display_qr_code?: {
			readonly hosted_instructions_url: string
			readonly mobile_auth_url: string
			readonly qr_code: {
				readonly expires_at: number
				readonly image_url_png: string
				readonly image_url_svg: string
			}
		} | null
		readonly redirect_to_url?: {
			readonly return_url?: string | null
			readonly url?: string | null
		} | null
		readonly type: string
		readonly use_stripe_sdk?: Record<string, unknown> | null
		readonly verify_with_microdeposits?: {
			readonly arrival_date: number
			readonly hosted_verification_url: string
			readonly microdeposit_type?: 'amounts' | 'descriptor_code' | null
		} | null
	} | null
	readonly on_behalf_of?: string | null
	readonly payment_method?: string | null
	readonly payment_method_configuration_details?: {
		readonly id: string
		readonly parent?: string | null
	} | null
	readonly payment_method_options?: Record<string, unknown> | null
	readonly payment_method_types: PaymentMethodType[]
	readonly single_use_mandate?: string | null
	readonly status: SetupIntentStatus
	readonly usage: UsageType
}

// ========================
// Type Guards
// ========================

/**
 * Type guards for Payment Method objects
 */
export function isStripePaymentMethod(
	obj: unknown
): obj is StripePaymentMethod {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'payment_method' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

export function isCardPaymentMethod(pm: StripePaymentMethod): boolean {
	return pm.type === 'card' && pm.card !== null
}

export function isUSBankAccountPaymentMethod(pm: StripePaymentMethod): boolean {
	return pm.type === 'us_bank_account' && pm.us_bank_account !== null
}

/**
 * Type guards for Checkout Session objects
 */
export function isStripeCheckoutSession(
	obj: unknown
): obj is StripeCheckoutSession {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'checkout.session' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

export function isCheckoutSessionCompleted(
	session: StripeCheckoutSession
): boolean {
	return session.payment_status === 'paid'
}

export function isSubscriptionCheckout(
	session: StripeCheckoutSession
): boolean {
	return session.mode === 'subscription'
}

/**
 * Type guards for Customer Portal Session objects
 */
export function isStripeCustomerPortalSession(
	obj: unknown
): obj is StripeCustomerPortalSession {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'billing_portal.session' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

/**
 * Type guards for Payment Intent objects
 */
export function isStripePaymentIntent(
	obj: unknown
): obj is StripePaymentIntent {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'payment_intent' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

export function isPaymentIntentSucceeded(intent: StripePaymentIntent): boolean {
	return intent.status === 'succeeded'
}

export function requiresAction(intent: StripePaymentIntent): boolean {
	return intent.status === 'requires_action'
}

export function isPaymentIntentCanceled(intent: StripePaymentIntent): boolean {
	return intent.status === 'canceled'
}

/**
 * Type guards for Setup Intent objects
 */
export function isStripeSetupIntent(obj: unknown): obj is StripeSetupIntent {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'setup_intent' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

export function isSetupIntentSucceeded(intent: StripeSetupIntent): boolean {
	return intent.status === 'succeeded'
}

export function setupRequiresAction(intent: StripeSetupIntent): boolean {
	return intent.status === 'requires_action'
}

// ========================
// Utility Functions
// ========================

/**
 * Payment Method utilities
 */
export function getPaymentMethodDisplayName(pm: StripePaymentMethod): string {
	if (pm.type === 'card' && pm.card) {
		const brand =
			pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
		return `${brand} ****${pm.card.last4}`
	}

	if (pm.type === 'us_bank_account' && pm.us_bank_account) {
		const bankName = pm.us_bank_account.bank_name || 'Bank'
		return `${bankName} ****${pm.us_bank_account.last4}`
	}

	return pm.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function getPaymentMethodBrand(pm: StripePaymentMethod): string | null {
	if (pm.type === 'card' && pm.card) {
		return pm.card.brand
	}
	return null
}

export function isPaymentMethodExpired(pm: StripePaymentMethod): boolean {
	if (pm.type === 'card' && pm.card) {
		const now = new Date()
		const currentYear = now.getFullYear()
		const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11

		return (
			pm.card.exp_year < currentYear ||
			(pm.card.exp_year === currentYear &&
				pm.card.exp_month < currentMonth)
		)
	}
	return false
}

/**
 * Checkout Session utilities
 */
export function getCheckoutSessionTotal(
	session: StripeCheckoutSession
): number | null | undefined {
	return session.amount_total
}

export function getCheckoutSessionTotalInDollars(
	session: StripeCheckoutSession
): number | null {
	if (session.amount_total === null || session.amount_total === undefined)
		{return null}
	return session.amount_total / 100
}

export function isCheckoutSessionExpired(
	session: StripeCheckoutSession
): boolean {
	return Date.now() / 1000 > session.expires_at
}

/**
 * Payment Intent utilities
 */
export function getPaymentIntentAmountInDollars(
	intent: StripePaymentIntent
): number {
	return intent.amount / 100
}

export function getPaymentIntentAmountReceivedInDollars(
	intent: StripePaymentIntent
): number {
	return intent.amount_received / 100
}

export function hasPaymentIntentFailed(intent: StripePaymentIntent): boolean {
	return intent.last_payment_error !== null
}

/**
 * Setup Intent utilities
 */
export function isSetupIntentForOffSession(intent: StripeSetupIntent): boolean {
	return intent.usage === 'off_session'
}

export function hasSetupIntentFailed(intent: StripeSetupIntent): boolean {
	return intent.last_setup_error !== null
}

/**
 * Portal Session utilities
 */
export function getPortalSessionReturnUrl(
	session: StripeCustomerPortalSession
): string | null {
	return session.return_url ?? null
}

export function hasPortalFlow(session: StripeCustomerPortalSession): boolean {
	return session.flow !== null
}

// ========================
// Event Object Types
// ========================
// NOTE: WEBHOOK_EVENT_TYPES and WebhookEventType are now imported from './stripe'
// to maintain single source of truth and avoid duplications

/**
 * Main Event object as used in TenantFlow webhooks
 */
export interface StripeEvent {
	readonly id: string
	readonly object: 'event'
	readonly api_version: string
	readonly created: number
	readonly data: {
		readonly object: string
		readonly previous_attributes?: Record<string, unknown> | null
	}
	readonly livemode: boolean
	readonly pending_webhooks: number
	readonly request?: {
		readonly id?: string | null
		readonly idempotency_key?: string | null
	} | null
	readonly type: WebhookEventType
}

/**
 * Type-safe event handlers for specific event types
 */
export type WebhookEventHandler<T = unknown> = (
	event: StripeEvent,
	objectData: T,
	context?: unknown
) => Promise<void>

export interface WebhookEventHandlers {
	// Subscription handlers
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED]: WebhookEventHandler<StripeSubscription>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED]: WebhookEventHandler<StripeSubscription>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED]: WebhookEventHandler<StripeSubscription>
	[WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END]: WebhookEventHandler<StripeSubscription>

	// Invoice handlers
	[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED]: WebhookEventHandler<StripeInvoice>
	[WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED]: WebhookEventHandler<StripeInvoice>
	[WEBHOOK_EVENT_TYPES.INVOICE_CREATED]: WebhookEventHandler<StripeInvoice>
	[WEBHOOK_EVENT_TYPES.INVOICE_FINALIZED]: WebhookEventHandler<StripeInvoice>

	// Payment Intent handlers
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED]: WebhookEventHandler<StripePaymentIntent>
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED]: WebhookEventHandler<StripePaymentIntent>
	[WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_REQUIRES_ACTION]: WebhookEventHandler<StripePaymentIntent>

	// Setup Intent handlers
	[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SUCCEEDED]: WebhookEventHandler<StripeSetupIntent>
	[WEBHOOK_EVENT_TYPES.SETUP_INTENT_SETUP_FAILED]: WebhookEventHandler<StripeSetupIntent>

	// Checkout Session handlers
	[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED]: WebhookEventHandler<StripeCheckoutSession>
	[WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_EXPIRED]: WebhookEventHandler<StripeCheckoutSession>

	// Payment Method handlers
	[WEBHOOK_EVENT_TYPES.PAYMENT_METHOD_ATTACHED]: WebhookEventHandler<StripePaymentMethod>
	[WEBHOOK_EVENT_TYPES.PAYMENT_METHOD_DETACHED]: WebhookEventHandler<StripePaymentMethod>

	// Customer handlers (import StripeCustomer from stripe-core-objects)
	[WEBHOOK_EVENT_TYPES.CUSTOMER_CREATED]: WebhookEventHandler<unknown>
	[WEBHOOK_EVENT_TYPES.CUSTOMER_UPDATED]: WebhookEventHandler<unknown>
	[WEBHOOK_EVENT_TYPES.CUSTOMER_DELETED]: WebhookEventHandler<unknown>
}

// ========================
// Event Utility Functions
// ========================

/**
 * Type guard for Event objects
 */
export function isStripeEvent(obj: unknown): obj is StripeEvent {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'event' &&
		'id' in obj &&
		typeof obj.id === 'string' &&
		'type' in obj &&
		typeof obj.type === 'string'
	)
}

/**
 * Check if event is a subscription event
 */
export function isSubscriptionEvent(event: StripeEvent): boolean {
	return event.type.startsWith('customer.subscription.')
}

/**
 * Check if event is an invoice event
 */
export function isInvoiceEvent(event: StripeEvent): boolean {
	return event.type.startsWith('invoice.')
}

/**
 * Check if event is a payment event
 */
export function isPaymentEvent(event: StripeEvent): boolean {
	return (
		event.type.startsWith('payment_intent.') ||
		event.type.startsWith('setup_intent.') ||
		event.type.startsWith('charge.')
	)
}

/**
 * Check if event is a customer event
 */
export function isCustomerEvent(event: StripeEvent): boolean {
	return (
		event.type.startsWith('customer.') &&
		!event.type.startsWith('customer.subscription.')
	)
}

/**
 * Check if event is a checkout event
 */
export function isCheckoutEvent(event: StripeEvent): boolean {
	return event.type.startsWith('checkout.session.')
}

/**
 * Get event priority for processing queue
 */
export function getEventPriority(
	event: StripeEvent
): 'high' | 'medium' | 'low' {
	// High priority: Payment failures, subscription cancellations
	if (
		event.type === WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED ||
		event.type === WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED ||
		event.type === WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED
	) {
		return 'high'
	}

	// Medium priority: Payment successes, subscription updates
	if (
		event.type === WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED ||
		event.type === WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED ||
		event.type === WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED ||
		event.type === WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED ||
		event.type === WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED
	) {
		return 'medium'
	}

	// Low priority: Everything else
	return 'low'
}

/**
 * Check if event should be processed (not a duplicate)
 */
export function shouldProcessEvent(
	event: StripeEvent,
	processedEventIds: Set<string>
): boolean {
	return !processedEventIds.has(event.id)
}

/**
 * Extract the main object from event data
 */
export function extractEventObject<T = unknown>(event: StripeEvent): T {
	return event.data.object as T
}

/**
 * Extract previous attributes for update events
 */
export function extractPreviousAttributes(
	event: StripeEvent
): Record<string, unknown> | null {
	return event.data.previous_attributes || null
}

/**
 * Check if event contains specific attribute changes
 */
export function hasAttributeChanged(
	event: StripeEvent,
	attributePath: string
): boolean {
	const previousAttributes = extractPreviousAttributes(event)
	if (!previousAttributes) {return false}

	return (
		attributePath.split('.').reduce<unknown>((obj, key) => {
			return obj && typeof obj === 'object'
				? (obj as Record<string, unknown>)[key]
				: undefined
		}, previousAttributes as unknown) !== undefined
	)
}

/**
 * Get event age in milliseconds
 */
export function getEventAge(event: StripeEvent): number {
	return Date.now() - event.created * 1000
}

/**
 * Check if event is stale (older than threshold)
 */
export function isEventStale(event: StripeEvent, maxAgeMs = 300000): boolean {
	return getEventAge(event) > maxAgeMs
}

// ========================
// Missing Payment Intent Utility Functions
// ========================

/**
 * Check if payment intent is processing
 */
export function isPaymentIntentProcessing(
	paymentIntent: StripePaymentIntent
): boolean {
	return paymentIntent.status === 'processing'
}

/**
 * Get setup intent customer ID
 */
export function getSetupIntentCustomerId(
	setupIntent: StripeSetupIntent
): string | null {
	return setupIntent.customer || null
}

/**
 * Get setup intent payment method ID
 */
export function getSetupIntentPaymentMethodId(
	setupIntent: StripeSetupIntent
): string | null {
	return setupIntent.payment_method || null
}

/**
 * Get payment intent amount
 */
export function getPaymentIntentAmount(
	paymentIntent: StripePaymentIntent
): number {
	return paymentIntent.amount
}

/**
 * Get payment intent currency
 */
export function getPaymentIntentCurrency(
	paymentIntent: StripePaymentIntent
): string {
	return paymentIntent.currency
}

/**
 * Get payment intent status
 */
export function getPaymentIntentStatus(
	paymentIntent: StripePaymentIntent
): PaymentIntentStatus {
	return paymentIntent.status
}

/**
 * Get payment intent customer ID
 */
export function getPaymentIntentCustomerId(
	paymentIntent: StripePaymentIntent
): string | null {
	return paymentIntent.customer || null
}
