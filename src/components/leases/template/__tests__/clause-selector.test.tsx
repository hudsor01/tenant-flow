/**
 * A11Y-02 proof for the clause-selector tooltip trigger.
 *
 * The icon-only <button> inside <TooltipTrigger> wraps only an <Info> icon, so it
 * has no visible-text accessible name. `aria-label="More information about this clause"`
 * supplies the accessible name. `getByRole('button', { name: /more information/i })`
 * resolves ONLY if that accessible name is wired correctly.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClauseSelector } from "#components/leases/template/clause-selector";

describe("ClauseSelector a11y", () => {
	it("exposes an accessible name on each icon-only info tooltip trigger", () => {
		render(
			<ClauseSelector
				selectedClauses={[]}
				onToggleClause={() => {}}
				recommendedClauses={new Set<string>()}
				state="CA"
			/>,
		);

		const infoButtons = screen.getAllByRole("button", {
			name: /more information/i,
		});

		expect(infoButtons.length).toBeGreaterThan(0);
		for (const button of infoButtons) {
			expect(button).toHaveAccessibleName("More information about this clause");
		}
	});
});
