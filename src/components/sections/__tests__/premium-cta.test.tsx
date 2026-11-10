/**
 * The premium CTA's two trust tiles: "No Setup Fees" is static, "Cancel
 * Anytime" links to the cancellation terms (66.2-39 fix round 3, F68). Part
 * I took the hover off both, so under the pointer only the base text-link
 * rule set the link apart: it reaches the link (it is not a Button) and drew
 * a primary/80 underline under every line of the tile's text. The link alone
 * now takes a border and fill hover, and no-underline.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PremiumCta } from "#components/sections/premium-cta";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";

describe("PremiumCta trust tiles", () => {
	it("gives the cancellation link a hover and keeps the static tile still", async () => {
		render(<PremiumCta />);
		const link = screen.getByRole("link", { name: /Cancel Anytime/ });
		const classes = [...link.classList];
		expect(classes).toEqual(
			expect.arrayContaining(["hover:border-primary/30", "hover:bg-card/40"]),
		);
		expect(computeAnchorRuleReach(link).rest).toBe(true);
		const designSystem = await loadProjectDesignSystem();
		const css = designSystem
			.candidatesToCss(classes)
			.filter((rule): rule is string => rule !== null)
			.join("\n");
		expect(css).toMatch(/text-decoration-line:\s*none/);

		const staticTile = screen.getByText("No Setup Fees").closest(".p-6");
		expect(staticTile?.tagName).toBe("DIV");
		expect(
			[...(staticTile?.classList ?? [])].filter((c) => c.startsWith("hover:")),
		).toEqual([]);
	}, 30_000);
});
