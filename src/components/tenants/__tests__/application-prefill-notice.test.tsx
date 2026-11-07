import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationPrefillNotice } from "#components/tenants/application-prefill-notice";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";

/**
 * The duplicate-tenant notice's `Button asChild` + `<Link>` pair (UI-SPEC §B-6).
 *
 * The `@layer base` anchor rules in globals.css (link color, a transparent
 * underline revealed on hover) skip an anchor carrying Button's
 * `data-slot="button"` (66.2-39 fix round 3, OD-3), so the link needs no
 * `no-underline`; `computeAnchorRuleReach` matches the rules' own selectors
 * against it. Its colour is still the link's to set: the `outline` variant
 * declares none, so without `text-foreground` it takes the AlertDescription's
 * muted colour. jsdom computes no cascade, so that class's presence is what is
 * assertable.
 */
describe("ApplicationPrefillNotice — the Button-styled link", () => {
	it("is passed by the base anchor rules and keeps text-foreground", () => {
		render(
			<ApplicationPrefillNotice
				matchedTenantId="11111111-1111-4111-8111-111111111111"
				matchedTenantName="Dana Rivera"
			/>,
		);

		const link = screen.getByRole("link", { name: /Dana Rivera/ });
		const reach = computeAnchorRuleReach(link);
		expect(reach.baseline).toEqual({ rest: true, hover: true });
		expect({ rest: reach.rest, hover: reach.hover }).toEqual({
			rest: false,
			hover: false,
		});
		expect(link.getAttribute("class")?.split(/\s+/) ?? []).toContain(
			"text-foreground",
		);
	});
});
