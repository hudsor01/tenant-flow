/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureTable } from "#app/compare/[competitor]/compare-sections";
import type { CompetitorData } from "#types/sections/compare";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

function makeData(features: CompetitorData["features"]): CompetitorData {
	return {
		name: "TestCompetitor",
		slug: "x",
		blogSlug: "x",
		tagline: "",
		description: "",
		metaDescription: "",
		heroSubtitle: "",
		capterra: "",
		g2: "",
		founded: "",
		bestFor: "",
		tenantflowPricing: [],
		competitorPricing: [],
		features,
		whySwitch: [],
		competitorStrengths: [],
	};
}

describe("CONS-07: neutral /compare/* framing", () => {
	it("renders the 'na' feature support as a neutral Minus with aria-label 'Not applicable'", () => {
		const { container } = render(
			<FeatureTable
				data={makeData([
					{
						name: "ACH / Payment Processing",
						tenantflow: "na",
						tenantflowNote: "By design — landlord-only platform",
						competitor: "yes",
					},
				])}
			/>,
		);
		const naIcon = container.querySelector('[aria-label="Not applicable"]');
		expect(
			naIcon,
			"'na' row did not render the Not-applicable icon",
		).not.toBeNull();
		expect(naIcon).toHaveClass("text-muted-foreground");
	});

	it("the 'na' row does not use a destructive color token", () => {
		const { container } = render(
			<FeatureTable
				data={makeData([
					{
						name: "HOA Management",
						tenantflow: "na",
						tenantflowNote: "Not applicable — landlord-only platform",
						competitor: "yes",
					},
				])}
			/>,
		);
		const naIcon = container.querySelector('[aria-label="Not applicable"]');
		expect(naIcon, "'na' icon missing").not.toBeNull();
		expect(
			naIcon?.className ?? "",
			"'na' icon must not carry a destructive color",
		).not.toContain("text-red");
		expect(
			naIcon?.className ?? "",
			"'na' icon must not carry the destructive token",
		).not.toContain("destructive");
	});

	it("compare-data.ts pins exactly 4 tenantflow:'na' rows", () => {
		const src = readFileSync(
			join(process.cwd(), "src/app/compare/[competitor]/compare-data.ts"),
			"utf8",
		);
		const naMatches = src.match(/tenantflow:\s*"na"/g) ?? [];
		expect(
			naMatches,
			"compare-data.ts must keep exactly 4 by-design 'na' rows",
		).toHaveLength(4);
	});

	it("FeatureSupport union still admits the 'na' member", () => {
		const support: CompetitorData["features"][number]["tenantflow"] = "na";
		expect(support).toBe("na");
	});
});
