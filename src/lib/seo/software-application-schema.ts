import type { SoftwareApplication } from "schema-dts";

interface SoftwareApplicationOffer {
	price: string;
	priceCurrency?: string;
}

interface SoftwareApplicationConfig {
	name: string;
	description: string;
	url?: string;
	applicationCategory?: string;
	operatingSystem?: string;
	offers?: SoftwareApplicationOffer[];
}

/**
 * Build the SoftwareApplication `offers` value.
 *
 * A single tier emits a plain `Offer`. Multiple tiers collapse to an
 * `AggregateOffer` (the schema.org type for a price RANGE) with `lowPrice`/
 * `highPrice`/`offerCount` — the canonical "from $X" representation for tiered
 * SaaS pricing, and a single offer object Google validates as one item.
 */
function buildOffers(offers: SoftwareApplicationOffer[]) {
	if (offers.length === 1) {
		const only = offers[0]!;
		return {
			"@type": "Offer" as const,
			price: only.price,
			priceCurrency: only.priceCurrency ?? "USD",
		};
	}

	const values = offers.map((o) => Number.parseFloat(o.price));
	const lowPrice = offers[values.indexOf(Math.min(...values))]!.price;
	const highPrice = offers[values.indexOf(Math.max(...values))]!.price;
	return {
		"@type": "AggregateOffer" as const,
		lowPrice,
		highPrice,
		priceCurrency: offers[0]!.priceCurrency ?? "USD",
		offerCount: offers.length,
	};
}

/**
 * Create a SoftwareApplication JSON-LD schema for software pricing/comparison
 * pages.
 *
 * SaaS is software, not a shippable retail product, so this deliberately uses
 * `SoftwareApplication` (not `Product`/`Offer`). `Product` pulls a page into
 * Google's Merchant-listings validation, which requires `shippingDetails` +
 * `hasMerchantReturnPolicy` — meaningless for software and the source of the
 * "Merchant listings: invalid item" error on /pricing. `SoftwareApplication`
 * exposes pricing via `offers` with none of that retail baggage.
 */
export function createSoftwareApplicationJsonLd(
	config: SoftwareApplicationConfig,
): SoftwareApplication {
	const {
		name,
		description,
		url,
		applicationCategory,
		operatingSystem,
		offers,
	} = config;

	return {
		"@type": "SoftwareApplication",
		name,
		description,
		...(url ? { url } : {}),
		applicationCategory: applicationCategory ?? "BusinessApplication",
		operatingSystem: operatingSystem ?? "Web Browser",
		...(offers && offers.length > 0 ? { offers: buildOffers(offers) } : {}),
	};
}
