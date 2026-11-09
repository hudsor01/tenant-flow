import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CheckoutCancelPage from "./page";

afterEach(() => cleanup());

// 66.2-39 fix round 4, Part 8l: an owner whose plan has lapsed comes back here
// from Stripe; the proxy sends the dashboard to /pricing, and Settings stays
// open, so the way out is billing settings.
describe("CheckoutCancelPage", () => {
	it("offers Try Again and billing settings, both reachable whatever the plan", () => {
		render(<CheckoutCancelPage />);

		expect(screen.getByRole("link", { name: "Try Again" })).toHaveAttribute(
			"href",
			"/billing/plans",
		);
		expect(
			screen.getByRole("link", { name: "Go to Billing Settings" }),
		).toHaveAttribute("href", "/settings?tab=billing");
		expect(screen.queryByRole("link", { name: /dashboard/i })).toBeNull();
	});
});
