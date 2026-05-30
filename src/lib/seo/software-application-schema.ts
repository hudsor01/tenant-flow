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
	const currency = offers[0]!.priceCurrency ?? "USD";

	if (offers.length === 1) {
		return {
			"@type": "Offer" as const,
			price: offers[0]!.price,
			priceCurrency: currency,
		};
	}

	// An AggregateOffer carries ONE priceCurrency for the whole range, so a
	// mixed-currency tier set can't be represented — reject it rather than
	// silently dropping the other tiers' currency.
	if (offers.some((o) => (o.priceCurrency ?? "USD") !== currency)) {
		throw new Error(
			"buildOffers: all offers must share a single priceCurrency",
		);
	}

	// Find lowest/highest by parsed numeric value while preserving the original
	// price STRING (so "19.00" formatting survives). Reduce rather than
	// indexOf(Math.min(...)) — indexOf(NaN) is -1, which would index past the
	// array, and duplicate prices would resolve ambiguously.
	let low = offers[0]!;
	let high = offers[0]!;
	for (const offer of offers) {
		const value = Number.parseFloat(offer.price);
		if (!Number.isFinite(value)) {
			throw new Error(`buildOffers: non-numeric price "${offer.price}"`);
		}
		if (value < Number.parseFloat(low.price)) low = offer;
		if (value > Number.parseFloat(high.price)) high = offer;
	}

	return {
		"@type": "AggregateOffer" as const,
		lowPrice: low.price,
		highPrice: high.price,
		priceCurrency: currency,
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
