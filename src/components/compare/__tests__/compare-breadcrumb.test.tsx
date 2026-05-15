/**
 * Tests for CompareBreadcrumb.
 *
 * Pins the segment shape so the visible breadcrumb matches the JSON-LD
 * BreadcrumbList emitted by `createBreadcrumbJsonLd` for the same competitor
 * slug. Drift between visible and schema-form breadcrumbs is a documented
 * search-penalty risk (Pitfall 2 — see Phase 6 research).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

import { CompareBreadcrumb } from "#components/compare/compare-breadcrumb";

describe("CompareBreadcrumb", () => {
	it("renders 3 segments: Home > Compare > TenantFlow vs <competitor>", () => {
		render(<CompareBreadcrumb competitorName="Buildium" />);

		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.getByRole("link", { name: "Compare" })).toHaveAttribute(
			"href",
			"/compare",
		);
		expect(screen.getByText("TenantFlow vs Buildium")).toBeInTheDocument();
	});

	it('uses aria-current="page" on the comparison segment', () => {
		render(<CompareBreadcrumb competitorName="AppFolio" />);
		const current = screen.getByText("TenantFlow vs AppFolio");
		expect(current).toHaveAttribute("aria-current", "page");
	});

	it('renders inside a nav landmark with aria-label="breadcrumb"', () => {
		render(<CompareBreadcrumb competitorName="RentRedi" />);
		const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
		expect(nav).toBeInTheDocument();
	});

	it("embeds the competitor name verbatim (no transform)", () => {
		render(<CompareBreadcrumb competitorName="App Folio Inc." />);
		expect(
			screen.getByText("TenantFlow vs App Folio Inc."),
		).toBeInTheDocument();
	});
});
