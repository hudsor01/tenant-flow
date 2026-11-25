import { OG_CARD_KEYS, OG_CARDS, type OgCardKey } from "#lib/seo/og-cards";
import { ogCardResponse } from "../_shared/og-card";

// Every page's share card, one PNG per `OG_CARDS` key, rendered at build time.
// The text is fixed at compile time, so nothing regenerates at runtime, and a
// key outside the catalog is a 404 (`dynamicParams = false`). The blog and
// compare cards live in their own sibling routes.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): { page: OgCardKey }[] {
	return OG_CARD_KEYS.map((page) => ({ page }));
}

interface RouteParams {
	params: Promise<{ page: string }>;
}

function isCardKey(value: string): value is OgCardKey {
	return Object.hasOwn(OG_CARDS, value);
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { page } = await params;
	if (!isCardKey(page)) return new Response("Not found", { status: 404 });
	return ogCardResponse(OG_CARDS[page]);
}
