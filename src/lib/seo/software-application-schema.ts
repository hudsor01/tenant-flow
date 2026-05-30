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

// A non-negative decimal — no sign, no trailing junk, no scientific notation.
// Anchored so the WHOLE string is validated (Number.parseFloat would accept a
// numeric prefix like "19abc" and the original string would then ship verbatim
// into the JSON-LD; Number("") is 0, also wrong). Google requires price >= 0.
const PRICE_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Parse and validate a price string. Throws on anything that isn't a clean
 * non-negative decimal so a malformed price can never reach the rendered
 * JSON-LD. Returns the numeric value for min/max comparison.
 */
function parsePrice(price: string): number {
	if (!PRICE_PATTERN.test(price)) {
		throw new Error(`buildOffers: invalid price "${price}"`);
	}
	return Number(price);
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
		// Validate even a lone price so a malformed value never ships.
		parsePrice(offers[0]!.price);
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

	// Find lowest/highest by numeric value while preserving the original price
	// STRING (so "19.00" formatting survives). Seed with ±Infinity so the first
	// valid offer sets both bounds; duplicate prices resolve to first-seen via
	// strict </>. parsePrice validates every tier (including offers[0]).
	let low = offers[0]!;
	let high = offers[0]!;
	let lowValue = Number.POSITIVE_INFINITY;
	let highValue = Number.NEGATIVE_INFINITY;
	for (const offer of offers) {
		const value = parsePrice(offer.price);
		if (value < lowValue) {
			lowValue = value;
			low = offer;
		}
		if (value > highValue) {
			highValue = value;
			high = offer;
		}
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
