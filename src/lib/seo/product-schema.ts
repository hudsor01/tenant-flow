import type { Product } from 'schema-dts'

import { getSiteUrl } from '#lib/generate-metadata'

interface OfferConfig {
	name: string
	price: string
	url?: string
}

interface ProductJsonLdConfig {
	name: string
	description: string
	offers: OfferConfig[]
	image?: string
}

/** Compute a date 1 year from now in YYYY-MM-DD format */
function getOneYearFromNow(): string {
	const date = new Date()
	date.setFullYear(date.getFullYear() + 1)
	return date.toISOString().split('T')[0]!
}

/**
 * Create a Product JSON-LD schema with dynamic priceValidUntil.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createProductJsonLd(config: ProductJsonLdConfig): Product {
	const siteUrl = getSiteUrl()
	const { name, description, offers, image } = config
	const priceValidUntil = getOneYearFromNow()

	return {
		'@type': 'Product',
		name,
		description,
		...(image ? { image } : {}),
		url: `${siteUrl}/pricing`,
		brand: {
			'@type': 'Organization',
			name: 'TenantFlow'
		},
		offers: offers.map(offer => ({
			'@type': 'Offer' as const,
			name: offer.name,
			price: offer.price,
			priceCurrency: 'USD',
			priceValidUntil,
			availability: 'https://schema.org/InStock',
			url: offer.url ?? `${siteUrl}/pricing`,
			// Digital SaaS — no physical shipping; Google requires the field anyway.
			shippingDetails: {
				'@type': 'OfferShippingDetails',
				shippingRate: {
					'@type': 'MonetaryAmount',
					value: '0',
					currency: 'USD'
				},
				shippingDestination: {
					'@type': 'DefinedRegion',
					addressCountry: 'US'
				},
				deliveryTime: {
					'@type': 'ShippingDeliveryTime',
					handlingTime: {
						'@type': 'QuantitativeValue',
						minValue: 0,
						maxValue: 0,
						unitCode: 'DAY'
					},
					transitTime: {
						'@type': 'QuantitativeValue',
						minValue: 0,
						maxValue: 0,
						unitCode: 'DAY'
					}
				}
			},
			// Subscription cancellation policy — refunds prorated, no physical returns.
			hasMerchantReturnPolicy: {
				'@type': 'MerchantReturnPolicy',
				applicableCountry: 'US',
				returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
			}
		}))
	}
}
