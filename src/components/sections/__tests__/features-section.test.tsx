/**
 * FeaturesSectionDemo component test — Phase 8 CONS-02 regression pin.
 *
 * CONS-02's icon fix shipped in source already (commit 7540ebe48); this test
 * locks the Multi-Property Dashboard card's LayoutDashboard icon so a future
 * edit can't silently revert it to a wrong icon (the audit flagged a back-arrow).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FeaturesSectionDemo from "#components/sections/features-section";

describe("FeaturesSectionDemo", () => {
	it("Multi-Property Dashboard card renders the LayoutDashboard icon (CONS-02)", () => {
		const { container } = render(<FeaturesSectionDemo />);
		const heading = [...container.querySelectorAll("h3")].find(
			(h) => h.textContent === "Multi-Property Dashboard",
		);
		expect(heading).toBeTruthy();
		const card = heading?.closest("div.group\\/feature");
		expect(card).toBeTruthy();
		// lucide-react emits class "lucide lucide-layout-dashboard" on the <svg>.
		expect(card?.querySelector("svg.lucide-layout-dashboard")).not.toBeNull();
	});

	it("Multi-Property Dashboard card does NOT render an arrow-left icon (CONS-02)", () => {
		const { container } = render(<FeaturesSectionDemo />);
		const heading = [...container.querySelectorAll("h3")].find(
			(h) => h.textContent === "Multi-Property Dashboard",
		);
		const card = heading?.closest("div.group\\/feature");
		expect(card?.querySelector("svg.lucide-arrow-left")).toBeNull();
	});

	it("renders all six feature cards (coverage + headline pin)", () => {
		render(<FeaturesSectionDemo />);
		for (const title of [
			"Property Management",
			"Fast Setup",
			"Transparent Pricing",
			"Multi-Property Dashboard",
			"Email Support",
			"Document Vault",
		]) {
			expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
		}
	});
});
