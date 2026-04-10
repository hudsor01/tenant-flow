import type { SoftwareApplication } from 'schema-dts'

interface SoftwareApplicationOffer {
	price: string
	priceCurrency?: string
}

interface SoftwareApplicationConfig {
	name: string
	description: string
	url?: string
	applicationCategory?: string
	operatingSystem?: string
	offers?: SoftwareApplicationOffer[]
}

/**
 * Create a SoftwareApplication JSON-LD schema for comparison pages.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createSoftwareApplicationJsonLd(
	config: SoftwareApplicationConfig
): SoftwareApplication {
	const {
		name,
		description,
		url,
		applicationCategory,
		operatingSystem,
		offers
	} = config

	return {
		'@type': 'SoftwareApplication',
		name,
		description,
		...(url ? { url } : {}),
		applicationCategory: applicationCategory ?? 'BusinessApplication',
		operatingSystem: operatingSystem ?? 'Web Browser',
		...(offers && offers.length > 0
			? {
					offers: offers.map(o => ({
						'@type': 'Offer' as const,
						price: o.price,
						priceCurrency: o.priceCurrency ?? 'USD'
					}))
				}
			: {})
	}
}
