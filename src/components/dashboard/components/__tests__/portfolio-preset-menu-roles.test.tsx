/**
 * The dashboard's Presets menu holds only menu items (66.2-39 fix round 4,
 * Part 8h; WCAG 4.1.2).
 *
 * The menu held the preset name field and its save button: a `menu` may own
 * only menu items, groups and separators, so axe's `aria-required-children`
 * failed the open menu ("children which are not allowed: input[aria-label],
 * button[aria-label]"), and a screen reader in the menu's item mode skips the
 * field. The menu's "Save current view…" item now opens a dialog with the
 * labelled field.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { PortfolioPresetMenu } from "#components/dashboard/components/portfolio-preset-menu";
import { useDashboardPresetsStore } from "#stores/dashboard-presets-store";

const wrapper = ({ children }: { children: ReactNode }) => (
	<NuqsTestingAdapter>{children}</NuqsTestingAdapter>
);

describe("the Presets menu", () => {
	beforeEach(() => {
		useDashboardPresetsStore.setState({ presets: {} });
	});

	it("owns only menu items, and saves through a labelled dialog field", async () => {
		const user = userEvent.setup();
		render(<PortfolioPresetMenu />, { wrapper });
		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		const menu = await screen.findByRole("menu");
		expect(
			[...menu.querySelectorAll("input, textarea, button")].map((el) =>
				el.getAttribute("aria-label"),
			),
		).toEqual([]);
		await user.click(
			within(menu).getByRole("menuitem", { name: "Save current view…" }),
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Save current view",
		});
		await user.type(
			within(dialog).getByRole("textbox", { name: "Preset name" }),
			"Vacant only",
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Save preset" }),
		);
		expect(
			useDashboardPresetsStore.getState().presets["Vacant only"],
		).toBeDefined();
	});
});
