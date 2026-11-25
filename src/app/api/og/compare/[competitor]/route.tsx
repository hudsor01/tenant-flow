import {
	COMPETITORS,
	VALID_COMPETITORS,
} from "#app/compare/[competitor]/compare-data";
import { compareCard } from "#lib/seo/og-cards";
import { ogCardResponse } from "../../_shared/og-card";

// A comparison page's share card (`compareCard`), in the shared layout. One
// PNG per competitor, rendered at build time; any other slug is a 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): { competitor: string }[] {
	return VALID_COMPETITORS.map((competitor) => ({ competitor }));
}

interface RouteParams {
	params: Promise<{ competitor: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { competitor: slug } = await params;
	const data = Object.hasOwn(COMPETITORS, slug) ? COMPETITORS[slug] : undefined;

	if (!data) {
		return new Response("Not found", { status: 404 });
	}

	return ogCardResponse(compareCard(data.name));
}
