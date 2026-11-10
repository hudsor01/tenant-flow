/**
 * A Button-styled link is a button, not a text link (66.2-39 fix round 3, F27,
 * OD-3).
 *
 * `Button asChild` renders its classes onto the child `<a>`, and the classes
 * hold no "button" substring and no `role`, so the `@layer base` text-link
 * rules in globals.css (link color, a transparent underline that turns visible
 * on hover) used to reach every such anchor: "Add Unit", "Reports", "Edit" and
 * the /pricing/cancel links (a page deleted since) underlined on hover, and an
 * outline or ghost Button-link took the link color. Button puts
 * `data-slot="button"` on the anchor, and the rules' guards now exclude it.
 * `computeAnchorRuleReach` matches the rules' own selectors, read from
 * globals.css, against the rendered anchor; an unclassed link in the same
 * document is the positive control, and a plain text link still takes the
 * rules.
 */
import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { Button } from "#components/ui/button";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";

const VARIANTS = [
	"default",
	"destructive",
	"outline",
	"secondary",
	"ghost",
	"link",
] as const;

describe("the base anchor rules pass a Button-styled link by", () => {
	it.each(VARIANTS)("the %s variant", (variant) => {
		render(
			<Button asChild variant={variant}>
				<Link href="/units/new">Add Unit</Link>
			</Button>,
		);
		const link = screen.getByRole("link", { name: "Add Unit" });
		expect(link).toHaveAttribute("data-slot", "button");
		const reach = computeAnchorRuleReach(link);
		expect(reach.baseline).toEqual({ rest: true, hover: true });
		expect({ rest: reach.rest, hover: reach.hover }).toEqual({
			rest: false,
			hover: false,
		});
	});

	it("and still style a plain text link", () => {
		render(<Link href="/terms">Terms</Link>);
		const reach = computeAnchorRuleReach(
			screen.getByRole("link", { name: "Terms" }),
		);
		expect(reach).toEqual({
			rest: true,
			hover: true,
			baseline: { rest: true, hover: true },
		});
	});
});
