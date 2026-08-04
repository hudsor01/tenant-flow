/**
 * MainNav Component Tests
 *
 * Tests the main navigation sidebar component including:
 * - Core navigation items rendering
 * - Expandable/collapsible sections
 * - Active state highlighting
 * - Settings menu behavior
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainNav } from "../main-nav";

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}));

describe("MainNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.mockReturnValue("/dashboard");
	});

	describe("core navigation items", () => {
		it("should render all core navigation items", () => {
			render(<MainNav />);

			expect(
				screen.getByRole("link", { name: /dashboard/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /properties/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /tenants/i }),
			).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /leases/i })).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /maintenance/i }),
			).toBeInTheDocument();
			// Anchored regex avoids matching the "Tax Documents" sub-link
			// once the Reports section is expanded.
			expect(
				screen.getByRole("link", { name: /^documents$/i }),
			).toBeInTheDocument();
		});

		it("should render correct hrefs for core items", () => {
			render(<MainNav />);

			expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
				"href",
				"/dashboard",
			);
			expect(screen.getByRole("link", { name: /properties/i })).toHaveAttribute(
				"href",
				"/properties",
			);
			expect(screen.getByRole("link", { name: /tenants/i })).toHaveAttribute(
				"href",
				"/tenants",
			);
			expect(screen.getByRole("link", { name: /leases/i })).toHaveAttribute(
				"href",
				"/leases",
			);
			expect(
				screen.getByRole("link", { name: /maintenance/i }),
			).toHaveAttribute("href", "/maintenance");
			expect(
				screen.getByRole("link", { name: /^documents$/i }),
			).toHaveAttribute("href", "/documents");
		});

		// Phase 65 (DOCS-01), A-1: pins the Documents entry as FLAT *structurally*.
		// `renderNavItem`'s hasChildren branch renders a parent as a <button> toggle
		// with no <Link> at all, so if Documents ever gained children the landing
		// would lose its one-click sidebar door. Both halves are required: the
		// absence of the button alone would also pass against a sidebar that renders
		// no Documents entry whatsoever.
		it("should render Documents as a flat link, never as an expandable button", () => {
			render(<MainNav />);

			expect(
				screen.queryByRole("button", { name: /^documents$/i }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /^documents$/i }),
			).toHaveAttribute("href", "/documents");
		});
	});

	describe("active state highlighting", () => {
		it("should highlight Dashboard when on /dashboard", () => {
			mockPathname.mockReturnValue("/dashboard");
			render(<MainNav />);

			const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
			expect(dashboardLink.className).toContain("text-primary-text");
		});

		it("should highlight Properties when on /properties", () => {
			mockPathname.mockReturnValue("/properties");
			render(<MainNav />);

			const propertiesLink = screen.getByRole("link", { name: /properties/i });
			expect(propertiesLink.className).toContain("text-primary-text");
		});

		it("should highlight Properties when on nested property route", () => {
			mockPathname.mockReturnValue("/properties/123");
			render(<MainNav />);

			const propertiesLink = screen.getByRole("link", { name: /properties/i });
			expect(propertiesLink.className).toContain("text-primary-text");
		});

		it("should not highlight other items when Dashboard is active", () => {
			mockPathname.mockReturnValue("/dashboard");
			render(<MainNav />);

			const propertiesLink = screen.getByRole("link", { name: /properties/i });
			expect(propertiesLink.className).not.toContain("text-primary-text");
		});
	});

	describe("expandable sections", () => {
		it("should render Analytics as expandable button", () => {
			render(<MainNav />);

			const analyticsButton = screen.getByRole("button", {
				name: /analytics/i,
			});
			expect(analyticsButton).toBeInTheDocument();
		});

		it("should render Reports as expandable button", () => {
			render(<MainNav />);

			const reportsButton = screen.getByRole("button", { name: /reports/i });
			expect(reportsButton).toBeInTheDocument();
		});

		// D-29 FULL SEPARATION: this block carries exactly TWO peer sections —
		// Analytics and Reports. Asserted as an exhaustive list rather than as the
		// absence of the one section just deleted, so a third section reappearing
		// under any name fails here.
		it("should render exactly two collapsible sections", () => {
			const { container } = render(<MainNav />);

			const sectionLabels = Array.from(
				container.querySelectorAll('button[aria-controls^="nav-section-"]'),
			).map((button) => button.textContent?.trim());

			expect(sectionLabels).toEqual(["Analytics", "Reports"]);
		});

		it("should toggle Analytics children visibility on click", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const analyticsButton = screen.getByRole("button", {
				name: /analytics/i,
			});

			// Click to expand
			await user.click(analyticsButton);

			// Now we should find Overview link
			expect(
				screen.getByRole("link", { name: /^overview$/i }),
			).toBeInTheDocument();
		});

		// The Analytics section is untouched by the consolidation (D-07 REVISED):
		// /analytics/financial stays live, so removing its child would orphan a
		// working page.
		it("should still list all three Analytics children including Financial", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			await user.click(screen.getByRole("button", { name: /analytics/i }));

			expect(screen.getByRole("link", { name: /^overview$/i })).toHaveAttribute(
				"href",
				"/analytics/overview",
			);
			expect(
				screen.getByRole("link", { name: /^financial$/i }),
			).toHaveAttribute("href", "/analytics/financial");
			expect(
				screen.getByRole("link", { name: /property performance/i }),
			).toHaveAttribute("href", "/analytics/property-performance");
		});

		it("should show the seven Reports children when expanded", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const reportsButton = screen.getByRole("button", { name: /reports/i });
			await user.click(reportsButton);

			const expected = [
				[/income statement/i, "/reports/income-statement"],
				[/cash flow/i, "/reports/cash-flow"],
				[/balance sheet/i, "/reports/balance-sheet"],
				[/^expenses$/i, "/reports/expenses"],
				[/tax documents/i, "/reports/tax-documents"],
				[/generate reports/i, "/reports/generate"],
				[/year-end/i, "/reports/year-end"],
			] as const;

			for (const [name, href] of expected) {
				expect(screen.getByRole("link", { name })).toHaveAttribute(
					"href",
					href,
				);
			}
		});
	});

	describe("templates section removal (Phase 65 D-09)", () => {
		// `getByText`'s default string match is EXACT, so the "Lease Template" label
		// elsewhere would not satisfy this query even if it survived. After D-09 no
		// "Templates" text exists anywhere in this component at all.
		it("should NOT render a Templates section header", () => {
			render(<MainNav />);

			expect(screen.queryByText("Templates")).not.toBeInTheDocument();
		});

		it("should NOT render Generate Lease link (Session 11 P3 #36: duplicate of Leases tab New Lease CTA)", () => {
			render(<MainNav />);

			expect(
				screen.queryByRole("link", { name: /generate lease/i }),
			).not.toBeInTheDocument();
		});

		// One exhaustive assertion pinning THREE things at once: the core entry was
		// repointed to /documents, the Lease Template link is gone, and no new
		// /documents/* sidebar entry crept in. It cannot pass vacuously — an empty
		// sidebar yields [], not ["/documents"].
		//
		// Collapsed nav children ARE queryable here (jsdom does not implement
		// `inert`), so the Reports and Analytics children genuinely appear in this
		// collected set and genuinely contribute no /documents* href. The assertion
		// is not passing because they were hidden.
		it("should surface exactly one /documents href in the whole sidebar", () => {
			const { container } = render(<MainNav />);

			const documentHrefs = Array.from(container.querySelectorAll("a"))
				.map((a) => a.getAttribute("href") ?? "")
				.filter(
					(href) => href === "/documents" || href.startsWith("/documents/"),
				);

			expect(documentHrefs).toEqual(["/documents"]);
		});
	});

	describe("settings menu", () => {
		it("should render Settings button", () => {
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			expect(settingsButton).toBeInTheDocument();
		});

		it("should show dropdown menu when Settings is clicked", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			expect(
				screen.getByRole("link", { name: /help & support/i }),
			).toBeInTheDocument();
		});

		it("should render Help & Support link with correct href", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			const helpLink = screen.getByRole("link", { name: /help & support/i });
			expect(helpLink).toHaveAttribute("href", "/help");
		});

		it("should call onNavigate when Help & Support is clicked", async () => {
			const user = userEvent.setup();
			const onNavigate = vi.fn();
			render(<MainNav onNavigate={onNavigate} />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			const helpLink = screen.getByRole("link", { name: /help & support/i });
			await user.click(helpLink);

			expect(onNavigate).toHaveBeenCalledTimes(1);
		});

		it("should show keyboard shortcuts item in dropdown", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
		});

		it('should show keyboard shortcut indicator "?"', async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			expect(screen.getByText("?")).toBeInTheDocument();
		});

		it("should close dropdown when clicking outside", async () => {
			const user = userEvent.setup();
			render(<MainNav />);

			const settingsButton = screen.getByRole("button", { name: /settings/i });
			await user.click(settingsButton);

			// Verify dropdown is open
			expect(
				screen.getByRole("link", { name: /help & support/i }),
			).toBeInTheDocument();

			// Click outside (on the backdrop)
			const backdrop = document.querySelector(".fixed.inset-0");
			expect(backdrop).toBeInTheDocument();
			await user.click(backdrop!);

			// Verify dropdown is closed
			expect(
				screen.queryByRole("link", { name: /help & support/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("onNavigate callback", () => {
		it("should call onNavigate when a core nav item is clicked", async () => {
			const user = userEvent.setup();
			const onNavigate = vi.fn();
			render(<MainNav onNavigate={onNavigate} />);

			const propertiesLink = screen.getByRole("link", { name: /properties/i });
			await user.click(propertiesLink);

			expect(onNavigate).toHaveBeenCalledTimes(1);
		});

		it("should call onNavigate when an expanded child is clicked", async () => {
			const user = userEvent.setup();
			const onNavigate = vi.fn();
			render(<MainNav onNavigate={onNavigate} />);

			// Expand Reports
			const reportsButton = screen.getByRole("button", { name: /reports/i });
			await user.click(reportsButton);

			// Click a child link
			const incomeStatementLink = screen.getByRole("link", {
				name: /income statement/i,
			});
			await user.click(incomeStatementLink);

			expect(onNavigate).toHaveBeenCalledTimes(1);
		});

		// Phase 65 D-09 retargeted this from the deleted Lease Template link to the
		// entry this phase actually changed. Anchored regex so it does not match the
		// "Tax Documents" child once Reports is expanded.
		it("should call onNavigate when the Documents link is clicked", async () => {
			const user = userEvent.setup();
			const onNavigate = vi.fn();
			render(<MainNav onNavigate={onNavigate} />);

			const documentsLink = screen.getByRole("link", {
				name: /^documents$/i,
			});
			await user.click(documentsLink);

			expect(onNavigate).toHaveBeenCalledTimes(1);
		});
	});
});
