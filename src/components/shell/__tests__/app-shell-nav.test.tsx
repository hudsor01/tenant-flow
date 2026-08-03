/**
 * AppShell command-palette route-table sweep (Phase 56 — RPTHUB-01/RPTHUB-02).
 *
 * WHY THIS FILE EXISTS. `app-shell.tsx` carries a SECOND complete route table —
 * the Cmd+K `commandGroups` list — that is easy to miss when the sidebar nav is
 * updated, and the file's own Templates-group comment records that a prior
 * review already caught exactly this class of miss once. `main-nav.test.tsx`
 * covers the sidebar only, so nothing pinned the palette until now.
 *
 * The palette renders its entries as `CommandItem`s with an `onSelect` handler
 * rather than anchors, so the hrefs never reach the DOM as attributes. The
 * assertion therefore intercepts the `commandGroups` prop on its way into
 * `AppShellSearch` and projects every href into the DOM, which keeps the check
 * on the real value the component passes rather than on a re-declared copy.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../app-shell";

const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
	useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseUser: () => ({ data: { id: "user-1", email: "o@example.com" } }),
}));

vi.mock("#hooks/api/use-auth-mutations", () => ({
	useSignOutMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock("#hooks/api/use-properties", () => ({
	usePropertyList: () => ({ data: [] }),
}));

vi.mock("#hooks/api/use-tenant", () => ({
	useTenantList: () => ({ data: { data: [] } }),
}));

vi.mock("../main-nav", () => ({
	MainNav: () => <nav data-testid="main-nav" />,
}));

vi.mock("../quick-actions-dock", () => ({
	QuickActionsDock: () => <div data-testid="quick-actions-dock" />,
}));

vi.mock("#components/ui/global-sync-indicator", () => ({
	GlobalSyncIndicator: () => <div data-testid="global-sync-indicator" />,
}));

vi.mock("#components/notifications/notification-bell", () => ({
	NotificationBell: () => <div data-testid="notification-bell" />,
}));

// Project the real `commandGroups` prop into the DOM so it can be asserted on
// without re-declaring the palette's route table inside this test.
vi.mock("../app-shell-search", () => ({
	AppShellSearch: ({
		commandGroups,
	}: {
		commandGroups: {
			heading: string;
			items: { label: string; href: string }[];
		}[];
	}) => (
		<ul data-testid="palette-hrefs">
			{commandGroups.flatMap((group) =>
				group.items.map((item) => (
					<li
						key={`${group.heading}::${item.href}`}
						data-heading={group.heading}
					>
						{item.href}
					</li>
				)),
			)}
		</ul>
	),
}));

function paletteHrefs(): string[] {
	render(<AppShell>Content</AppShell>);
	return screen
		.getAllByRole("listitem")
		.map((node) => node.textContent ?? "")
		.filter(Boolean);
}

describe("AppShell command palette route table", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.mockReturnValue("/dashboard");
	});

	// Stated as an allowlist rather than a denylist of the one deleted prefix:
	// an allowlist also catches the NEXT tree that gets consolidated away, and
	// it lets this file stay clear of the legacy URL literals that only the
	// redirect machinery is entitled to keep naming.
	it("targets only route trees that still exist", () => {
		const liveRoots = [
			"/dashboard",
			"/properties",
			"/tenants",
			"/leases",
			"/maintenance",
			"/documents",
			"/analytics",
			"/reports",
		];
		const hrefs = paletteHrefs();

		expect(hrefs.length).toBeGreaterThan(0);
		expect(
			hrefs.filter(
				(href) =>
					!liveRoots.some(
						(root) => href === root || href.startsWith(`${root}/`),
					),
			),
		).toEqual([]);
	});

	// Phase 65 (DOCS-01 / D-10 + L-04). The allowlist test above does NOT cover
	// this: it matches on live route ROOTS, and `/documents` is already on that
	// allowlist, so it would accept `/documents/vault` equally happily. This
	// exhaustive equality pins three things at once — the Navigation row was
	// repointed to the landing, `/documents/vault` is gone from the palette, and
	// the L-04 decision to KEEP the Templates row is executable rather than merely
	// written down. Order is the `commandGroups` flatMap order: Navigation is
	// group 0, Templates is group 2.
	it("points the palette Documents row at the landing and keeps the Templates row", () => {
		const hrefs = paletteHrefs();

		expect(
			hrefs.filter((h) => h === "/documents" || h.startsWith("/documents/")),
		).toEqual(["/documents", "/documents/lease-template"]);
	});

	// D-29 / D-24 amended: `/analytics/financial` is a GUARD, not a source. The
	// route stays live under full separation, so repointing its palette row would
	// break a working deep link — the single highest-risk edit in this phase.
	it("still contains all six /analytics rows including /analytics/financial", () => {
		const hrefs = paletteHrefs();

		for (const href of [
			"/analytics/overview",
			"/analytics/financial",
			"/analytics/property-performance",
			"/analytics/leases",
			"/analytics/maintenance",
			"/analytics/occupancy",
		]) {
			expect(hrefs).toContain(href);
		}
		expect(hrefs.filter((href) => href.startsWith("/analytics/"))).toHaveLength(
			6,
		);
	});

	it("reaches every one of the seven hub entries", () => {
		const hrefs = paletteHrefs();

		for (const href of [
			"/reports/income-statement",
			"/reports/cash-flow",
			"/reports/balance-sheet",
			"/reports/expenses",
			"/reports/tax-documents",
			"/reports/generate",
			"/reports/year-end",
		]) {
			expect(hrefs).toContain(href);
		}
		expect(hrefs).toContain("/reports");
	});

	it("groups the reporting rows under a single heading", () => {
		render(<AppShell>Content</AppShell>);

		const headings = new Set(
			screen
				.getAllByRole("listitem")
				.filter((node) => (node.textContent ?? "").startsWith("/reports"))
				.map((node) => node.getAttribute("data-heading")),
		);

		expect([...headings]).toEqual(["Analytics & Reports"]);
	});
});
