/**
 * @vitest-environment jsdom
 * The Delete Unit button's deleting spinner draws in the button's own label
 * color (66.2-39 fix round 4, G7; VD-09).
 *
 * The spinner sits on the destructive fill, beside the "Deleting..." label in
 * `text-destructive-foreground`. It took the page's `border-muted
 * border-t-foreground` instead: in light an opaque pale ring with a dark navy
 * arc beside the near-white label (arc 3.8:1 on the fill, label 4.63), in dark
 * an opaque page-colored track (1.54:1) with a near-white arc, so the two
 * themes drew opposite arcs. Its track and arc now take the fill's foreground,
 * the track at 30%, as update-password-form.tsx's button spinner does.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UnitListRow } from "#hooks/api/query-keys/unit-keys";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { render } from "#test/utils/test-render";

vi.mock("#hooks/api/use-unit", () => ({
	useDeleteUnitMutation: () => ({
		mutateAsync: () => new Promise<never>(() => undefined),
	}),
}));

import { UnitActions } from "../unit-actions";

/** Every border color the compiled classes of `element` set. */
async function borderColors(element: Element): Promise<string[]> {
	const designSystem = await loadProjectDesignSystem();
	return designSystem
		.candidatesToCss([...element.classList])
		.filter((rule): rule is string => rule !== null)
		.flatMap((rule) => [
			...rule.matchAll(/border(?:-[a-z]+)?-color:\s*([^;}]+)/g),
		])
		.map((match) => (match[1] ?? "").trim());
}

describe("the Delete Unit deleting state", () => {
	it("spins in the destructive fill's own foreground", async () => {
		const user = userEvent.setup();
		const unit = {
			id: "u1",
			unit_number: "4B",
			status: "available",
		} as UnitListRow;
		render(<UnitActions unit={unit} />);
		await user.click(screen.getByRole("button", { name: /Open actions menu/ }));
		await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
		// Radix closes the dialog on the action's click; a browser still shows
		// the deleting state through the close animation, which jsdom does not
		// run, so the click's default (the close) is held off here.
		const hold = (event: Event) => event.preventDefault();
		document.addEventListener("click", hold, true);
		await user.click(screen.getByRole("button", { name: "Delete Unit" }));
		document.removeEventListener("click", hold, true);
		const label = await screen.findByText("Deleting...");
		const button = label.closest("button");
		const spinner = button?.querySelector(".animate-spin");
		if (!button || !spinner) throw new Error("no deleting spinner");
		expect(button.className).toContain("text-destructive-foreground");
		const colors = await borderColors(spinner);
		expect(colors).toEqual([
			"color-mix(in oklab, var(--destructive-foreground) 30%, transparent)",
			"var(--destructive-foreground)",
		]);
	}, 30_000);
});
