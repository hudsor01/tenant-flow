/**
 * Competitor figures on /compare stay dated, fresh and internally consistent.
 *
 * Buildium's prices sat seven months stale (the page said $58 while Buildium
 * charged $65) and an AppFolio "$298/month minimum" that AppFolio never
 * published survived because nothing dated them. Each competitor now carries
 * the date its figures were read (`checkedAt`) and where (`pricingSource`),
 * the pages print "as of <Month YYYY>", and this file fails once a reading is
 * more than 180 days old, so a refresh can't be forgotten.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	COMPETITORS,
	VALID_COMPETITORS,
} from "#app/compare/[competitor]/compare-data";
import {
	formatCheckedMonth,
	PricingComparison,
} from "#app/compare/[competitor]/compare-sections";
import { getPricingPlan } from "#config/pricing";
import { parseLocalYmd } from "#lib/formatters/date";
import { formatPrice } from "#lib/utils/currency";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

const MAX_AGE_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

describe("competitor figures are dated and fresh", () => {
	it.each(VALID_COMPETITORS)(
		"%s was read from its own pages within the last 180 days",
		(slug) => {
			const data = COMPETITORS[slug];
			expect(data).toBeDefined();
			const checked = parseLocalYmd(data?.checkedAt ?? null);
			expect(checked, `${slug}: checkedAt must be YYYY-MM-DD`).toBeDefined();
			const ageDays = (Date.now() - (checked?.getTime() ?? 0)) / DAY_MS;
			expect(ageDays, `${slug}: checkedAt is in the future`).toBeGreaterThan(
				-1,
			);
			expect(
				ageDays,
				`${slug}: prices and ratings were read ${Math.floor(ageDays)} days ago. Re-read ${data?.pricingSource} and the Capterra and G2 listings, update compare-data.ts, and bump checkedAt.`,
			).toBeLessThanOrEqual(MAX_AGE_DAYS);
		},
	);

	it.each(VALID_COMPETITORS)("%s names where its prices came from", (slug) => {
		expect(COMPETITORS[slug]?.pricingSource).toMatch(
			/^[a-z0-9-]+(\.[a-z0-9-]+)+\/pricing$/,
		);
	});
});

describe("savings claims match the prices beside them", () => {
	// "Save over $1,800/year compared to Buildium Growth ($49/mo vs $202/mo)":
	// the stated figure is the yearly difference rounded down to the hundred.
	const SAVINGS =
		/Save over \$([\d,]+)\/year[^(]*\(\$(\d+)\/mo vs \$(\d+)\/mo\)/;

	const claims = VALID_COMPETITORS.flatMap((slug) =>
		(COMPETITORS[slug]?.whySwitch ?? [])
			.filter((line) => SAVINGS.test(line))
			.map((line) => [slug, line] as const),
	);

	it("finds the savings claims it checks", () => {
		expect(claims.length).toBeGreaterThan(0);
	});

	it.each(claims)("%s: %s", (_slug, line) => {
		const match = SAVINGS.exec(line);
		const stated = Number(match?.[1]?.replace(/,/g, ""));
		const ours = Number(match?.[2]);
		const theirs = Number(match?.[3]);
		const yearly = (theirs - ours) * 12;
		expect(stated).toBeLessThanOrEqual(yearly);
		expect(yearly - stated).toBeLessThan(100);
	});
});

describe("TenantFlow's own column matches the pricing config", () => {
	it.each(VALID_COMPETITORS)(
		"%s lists TenantFlow at its real prices",
		(slug) => {
			const prices = COMPETITORS[slug]?.tenantflowPricing.map(
				(tier) => tier.price,
			);
			const expected = (["starter", "growth", "max"] as const).map((id) =>
				formatPrice(getPricingPlan(id)?.price.monthly ?? 0, {
					interval: "month",
				}),
			);
			expect(prices).toEqual(expected);
		},
	);
});

describe("the pages print the as-of date", () => {
	it("formats a reading date as month and year", () => {
		expect(formatCheckedMonth("2026-11-24")).toBe("November 2026");
	});

	it("rejects a malformed reading date instead of printing it", () => {
		expect(() => formatCheckedMonth("Nov 2026")).toThrow();
	});

	it("puts the source and month under the competitor's prices", () => {
		const buildium = COMPETITORS.buildium;
		expect(buildium).toBeDefined();
		if (!buildium) return;
		render(<PricingComparison data={buildium} />);
		expect(
			screen.getByText(
				`Prices as of ${formatCheckedMonth(buildium.checkedAt)}, from buildium.com/pricing`,
			),
		).toBeInTheDocument();
	});
});
