/**
 * The `/faq` and `/help` closing CTA bands paint `bg-primary` and set their
 * copy and the outline CTA in `text-primary-foreground` (66.2-39 VD-56).
 *
 * - The outline Button variant fills `bg-background` (dark: `input/30`), so
 *   with the band's foreground label it read 1.01:1 light and 4.38:1 dark.
 *   The CTA is transparent on the band instead: its label reads 4.88:1 light
 *   and 6.84:1 dark on `bg-primary`, and its hover, `primary-text` on
 *   `primary-foreground`, 6.81:1 / 9.55:1. In dark the variant's `input/50`
 *   hover, `input` border and `foreground` hover label each lose to a `dark:`
 *   twin the CTA sets (66.2-39 fix round 3, F7): without
 *   `dark:hover:text-primary-text` the dark hover label was `foreground`.
 * - The 20px regular paragraph read `text-primary-foreground/90`, 4.24:1
 *   light; the full token reads 4.88:1.
 * - Focus (66.2-39 fix round 3, F30): the Button's 3px focus ring was
 *   `ring-ring/50` (opaque `ring-ring` since fix round 4), and `--ring` is the
 *   band's own blue (1.09:1 light, 1.00:1
 *   dark on `bg-primary`), with `focus-visible:border-ring` erasing the outline
 *   CTA's edge. Each CTA on the band draws its ring in
 *   `primary-foreground/80` instead, and the outline CTA's border turns
 *   `primary-foreground` on focus.
 *
 * Ratios: Chrome canvas readback under the compiled project CSS
 * (`.planning/tailwind-shadcn/audit/fix-round-1/status-colors.md` section 6).
 */
import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import FaqPage from "#app/faq/page";
import HelpPage from "#app/help/page";
import { render } from "#test/utils/test-render";

const BANDS: Array<{ page: string; render: () => ReactElement; cta: string }> =
	[
		{ page: "/faq", render: () => <FaqPage />, cta: "View Pricing" },
		{ page: "/help", render: () => <HelpPage />, cta: "Talk to an Expert" },
	];

describe.each(BANDS)("$page closing CTA band", ({ render: page, cta }) => {
	it("draws the outline CTA transparent on the primary band in both themes", () => {
		render(page());
		const link = screen.getByRole("link", { name: cta });
		const classes = link.className.split(/\s+/);
		expect(link.closest("section")).toHaveClass("bg-primary");
		expect(classes).toEqual(
			expect.arrayContaining([
				"bg-transparent",
				"dark:bg-transparent",
				"text-primary-foreground",
				"hover:bg-primary-foreground",
				"dark:hover:bg-primary-foreground",
				"hover:text-primary-text",
				"dark:hover:text-primary-text",
				"dark:border-primary-foreground/50",
			]),
		);
		for (const cls of [
			"bg-background",
			"dark:bg-input/30",
			"dark:hover:bg-input/50",
			"dark:hover:text-foreground",
			"dark:border-input",
		]) {
			expect(classes).not.toContain(cls);
		}
	});

	it("draws every CTA's focus ring in primary-foreground on the band", () => {
		render(page());
		const section = screen.getByRole("link", { name: cta }).closest("section");
		const links = [...(section?.querySelectorAll("a") ?? [])];
		expect(links).toHaveLength(2);
		for (const link of links) {
			const classes = link.className.split(/\s+/);
			expect(classes).toContain("focus-visible:ring-primary-foreground/80");
			expect(classes).not.toContain("focus-visible:ring-ring/50");
		}
		const outline = screen
			.getByRole("link", { name: cta })
			.className.split(/\s+/);
		expect(outline).toContain("focus-visible:border-primary-foreground");
		expect(outline).not.toContain("focus-visible:border-ring");
	});

	it("sets the band paragraph in the full primary-foreground token", () => {
		render(page());
		const section = screen.getByRole("link", { name: cta }).closest("section");
		const paragraph = section?.querySelector("p");
		expect(paragraph).toHaveClass("text-primary-foreground");
		expect(paragraph).not.toHaveClass("text-primary-foreground/90");
	});
});
