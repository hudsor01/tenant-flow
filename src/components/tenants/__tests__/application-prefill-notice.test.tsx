import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationPrefillNotice } from "#components/tenants/application-prefill-notice";

/**
 * The duplicate-tenant notice's `Button asChild` + `<Link>` pair (UI-SPEC §B-6).
 *
 * WHY A CLASS-PRESENCE TEST IS THE RIGHT SHAPE HERE, when the rest of this phase
 * deliberately measures geometry instead. The defect this guards is not a layout
 * outcome, it is a MISSING NEUTRALIZER: globals.css:504 styles
 * `a:not([role="button"]):not(.button):not([class*="button"])`, and an anchor
 * produced by `Button asChild` passes all three guards — `buttonVariants` emits
 * no class containing the substring "button" and `Button` sets no
 * `role="button"`. So the base rule lands, painting `color: var(--color-primary)`
 * and a hover underline onto a control that is supposed to read as an outline
 * button. The two classes below are the entire fix, and their absence is the
 * entire bug; jsdom computes no cascade, so their presence is exactly what is
 * assertable and exactly what regressed. `application-queue.test.tsx` pins the
 * same pair on the queue row for the same reason.
 */
describe("ApplicationPrefillNotice — base-rule neutralizers", () => {
	it("keeps no-underline and text-foreground on the anchor Button renders", () => {
		render(
			<ApplicationPrefillNotice
				matchedTenantId="11111111-1111-4111-8111-111111111111"
				matchedTenantName="Dana Rivera"
			/>,
		);

		const link = screen.getByRole("link", { name: /Dana Rivera/ });
		const classes = link.getAttribute("class")?.split(/\s+/) ?? [];

		// Without `no-underline` the control carries globals.css:504's underline,
		// drawn transparent and revealed on hover.
		expect(classes).toContain("no-underline");
		// Without `text-foreground` the `outline` variant — which sets no colour of
		// its own — inherits `color: var(--color-primary)` and renders link-blue.
		expect(classes).toContain("text-foreground");
	});
});
