/**
 * @vitest-environment jsdom
 *
 * What a crawler reads is the server HTML (2026-11-24 SEO audit, roadmap PR
 * 2a). Each case renders with `renderToString`, as the server does, and
 * checks that real content is in that HTML: the pricing FAQ answers and
 * comparison rows (P1, P2), the marketing stats' real figures (H1), the
 * deposit card's Itemized and Interest values (D5), and the space between
 * two heading lines (H2).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SecurityDepositReferenceCardPage from "#app/resources/security-deposit-reference-card/page";
import { PricingComparisonTable } from "#components/pricing/pricing-comparison-table";
import FeaturesSection from "#components/sections/features-section";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "#components/ui/accordion";
import { NumberTicker } from "#components/ui/number-ticker";

/** The HTML's text, as a crawler extracts it. */
function textOf(html: string): string {
	const doc = new DOMParser().parseFromString(html, "text/html");
	return (doc.body.textContent ?? "").replace(/\s+/g, " ");
}

describe("server HTML carries the real content", () => {
	it("keeps a closed, force-mounted accordion answer in the HTML, hidden (P1)", () => {
		const html = renderToString(
			<Accordion type="single" collapsible>
				<AccordionItem value="a">
					<AccordionTrigger>Question?</AccordionTrigger>
					<AccordionContent forceMount>The answer.</AccordionContent>
				</AccordionItem>
			</Accordion>,
		);
		expect(textOf(html)).toContain("The answer.");
		expect(html).toContain('data-state="closed"');
		expect(html).toContain("data-[state=closed]:hidden");
	});

	it("renders every comparison row, including closed categories (P2)", () => {
		const text = textOf(renderToString(<PricingComparisonTable />));
		for (const category of ["Leases", "Maintenance", "Support"])
			expect(text).toContain(category);
		expect(text).toContain("Priority email");
	});

	it("renders a startAtFinal ticker's real value, not 0 (H1)", () => {
		expect(
			textOf(renderToString(<NumberTicker value={1234} startAtFinal />)),
		).toBe("1,234");
		expect(textOf(renderToString(<NumberTicker value={1234} />))).toBe("0");
	});

	it("writes Yes or No in the deposit card's icon cells (D5)", () => {
		// The page's navbar reads the session through TanStack Query.
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<SecurityDepositReferenceCardPage />
			</QueryClientProvider>,
		);
		const doc = new DOMParser().parseFromString(html, "text/html");
		const alabama = [...doc.querySelectorAll("tr")].find((row) =>
			row.textContent?.startsWith("Alabama"),
		);
		const cells = [...(alabama?.querySelectorAll("td") ?? [])].map((cell) =>
			cell.textContent?.trim(),
		);
		expect(cells[3]).toBe("Yes");
		expect(cells[4]).toBe("No");
	});

	it("keeps a space between a heading's two lines (H2)", () => {
		expect(textOf(renderToString(<FeaturesSection />))).toContain(
			"The core tools for professional property management",
		);
	});
});
