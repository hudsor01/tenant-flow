/**
 * MainNav Component Tests
 *
 * MainNav renders the owner sidebar's navigation on the canonical shadcn
 * primitives (66.2 UIC-08): SidebarContent › SidebarGroup › SidebarMenu rows,
 * two Collapsible sections with SidebarMenuSub children, and a SidebarFooter
 * with the Settings and Help & Support links. Covered here:
 * - Locked navigation (66.2 D-40): core items in order and flat, exactly two
 *   peer sections with their children, no Templates and one /documents href
 * - Active state: `aria-current="page"` plus `data-active` on every link
 * - Section state (D-50): the section holding the active route is open, and a
 *   pathname change into a section opens it; closed sections unmount
 * - Footer (D-38): exactly Settings and Help & Support
 * - onNavigate (D-48): once per link click, never for a section toggle
 * - Base-rule neutralizers (D-49): every rendered list read by computed value
 * - Collapsed-rail inert (D-34): the nav landmark, content and footer carry
 *   `inert`
 *
 * MainNav reads `useSidebar()` through SidebarMenuButton, so every render goes
 * through `NavHarness`, which hosts SidebarProvider and the lifted section
 * state exactly as the AppShell inner child does.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "#components/ui/sidebar";
import { useNavSectionState } from "#hooks/use-nav-section-state";
import { computeListCascade } from "#test/utils/base-rule-cascade";
import { MainNav } from "../main-nav";

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}));

function NavHarness({
	onNavigate,
	defaultOpen = true,
}: {
	onNavigate?: () => void;
	defaultOpen?: boolean;
}) {
	const pathname = usePathname();
	const sections = useNavSectionState(pathname);
	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<MainNav sections={sections} {...(onNavigate ? { onNavigate } : {})} />
		</SidebarProvider>
	);
}

const TRIGGER_SELECTOR = '[data-slot="collapsible-trigger"]';

function getTriggers(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR));
}

function getTrigger(label: string): HTMLElement {
	const trigger = getTriggers().find((el) => el.textContent?.trim() === label);
	if (!trigger) throw new Error(`no section trigger named ${label}`);
	return trigger;
}

// Closed Radix sections unmount their children (D-50), so every sweep that
// reads sub-links opens both sections first.
async function openAllSections(user: UserEvent) {
	for (const trigger of document.querySelectorAll(
		`${TRIGGER_SELECTOR}[aria-expanded="false"]`,
	)) {
		await user.click(trigger);
	}
	const triggers = getTriggers();
	expect(triggers).toHaveLength(2);
	for (const trigger of triggers) {
		expect(trigger).toHaveAttribute("aria-expanded", "true");
	}
}

function getList(selector: string, index: number): HTMLElement {
	const list = document.querySelectorAll<HTMLElement>(selector)[index];
	if (!list) throw new Error(`no list ${selector} at ${index}`);
	return list;
}

const CORE = [
	["Dashboard", "/dashboard"],
	["Properties", "/properties"],
	["Tenants", "/tenants"],
	["Leases", "/leases"],
	["Applications", "/applications"],
	["Maintenance", "/maintenance"],
	["Documents", "/documents"],
] as const;

const ANALYTICS_CHILDREN = [
	["Overview", "/analytics/overview"],
	["Financial", "/analytics/financial"],
	["Property Performance", "/analytics/property-performance"],
] as const;

const REPORTS_CHILDREN = [
	["Income Statement", "/reports/income-statement"],
	["Cash Flow", "/reports/cash-flow"],
	["Balance Sheet", "/reports/balance-sheet"],
	["Expenses", "/reports/expenses"],
	["Tax Documents", "/reports/tax-documents"],
	["Generate Reports", "/reports/generate"],
	["Year-End", "/reports/year-end"],
] as const;

describe("MainNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.mockReturnValue("/dashboard");
	});

	describe("core navigation items", () => {
		it("renders the seven core links in order with their hrefs", () => {
			render(<NavHarness />);

			const coreList = getList('ul[data-slot="sidebar-menu"]', 0);
			const links = within(coreList).getAllByRole("link");
			expect(
				links.map((link) => [
					link.textContent?.trim(),
					link.getAttribute("href"),
				]),
			).toEqual(CORE.map(([label, href]) => [label, href]));
		});

		// Phase 65 (DOCS-01), A-1: pins the Documents entry as FLAT *structurally*.
		// A parent with children renders as a CollapsibleTrigger button with no
		// <Link> at all, so if Documents ever gained children the landing would
		// lose its one-click sidebar door. Both halves are required: the absence
		// of the button alone would also pass against a sidebar that renders no
		// Documents entry whatsoever.
		it("renders Documents as a flat link, never as an expandable button", () => {
			render(<NavHarness />);

			expect(
				screen.queryByRole("button", { name: /^documents$/i }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /^documents$/i }),
			).toHaveAttribute("href", "/documents");
		});
	});

	describe("active state", () => {
		it("marks Dashboard current on /dashboard and leaves Properties alone", () => {
			render(<NavHarness />);

			const dashboard = screen.getByRole("link", { name: "Dashboard" });
			expect(dashboard).toHaveAttribute("aria-current", "page");
			expect(dashboard).toHaveAttribute("data-active", "true");

			const properties = screen.getByRole("link", { name: "Properties" });
			expect(properties).not.toHaveAttribute("aria-current");
			expect(properties).toHaveAttribute("data-active", "false");
		});

		it("marks Properties current on a nested property route, icon included", () => {
			mockPathname.mockReturnValue("/properties/123");
			render(<NavHarness />);

			const properties = screen.getByRole("link", { name: "Properties" });
			expect(properties).toHaveAttribute("aria-current", "page");
			expect(properties).toHaveAttribute("data-active", "true");
			expect(properties.querySelector("svg")).toHaveClass("text-primary-text");

			const dashboard = screen.getByRole("link", { name: "Dashboard" });
			expect(dashboard).not.toHaveAttribute("aria-current");
		});
	});

	describe("sections", () => {
		// D-29 FULL SEPARATION: this block carries exactly TWO peer sections,
		// Analytics and Reports. Asserted as an exhaustive list rather than as the
		// absence of one deleted section, so a third section under any name fails.
		it("renders exactly two section toggles, Analytics then Reports", () => {
			render(<NavHarness />);

			const triggers = getTriggers();
			expect(triggers.map((el) => el.textContent?.trim())).toEqual([
				"Analytics",
				"Reports",
			]);
			for (const trigger of triggers) expect(trigger.tagName).toBe("BUTTON");
		});

		it("keeps both sections closed and unmounted outside them", () => {
			render(<NavHarness />);

			expect(getTrigger("Analytics")).toHaveAttribute("aria-expanded", "false");
			expect(getTrigger("Reports")).toHaveAttribute("aria-expanded", "false");
			expect(
				screen.queryByRole("link", { name: "Overview" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("link", { name: "Cash Flow" }),
			).not.toBeInTheDocument();
		});

		it("opens Reports on a Reports route and marks the current sub link", () => {
			mockPathname.mockReturnValue("/reports/cash-flow");
			render(<NavHarness />);

			expect(getTrigger("Reports")).toHaveAttribute("aria-expanded", "true");
			expect(getTrigger("Analytics")).toHaveAttribute("aria-expanded", "false");
			const cashFlow = screen.getByRole("link", { name: "Cash Flow" });
			expect(cashFlow).toHaveAttribute("aria-current", "page");
			expect(cashFlow).toHaveAttribute("data-active", "true");
			const expenses = screen.getByRole("link", { name: "Expenses" });
			expect(expenses).not.toHaveAttribute("aria-current");
		});

		it("opens Analytics on an Analytics route", () => {
			mockPathname.mockReturnValue("/analytics/financial");
			render(<NavHarness />);

			expect(getTrigger("Analytics")).toHaveAttribute("aria-expanded", "true");
			expect(getTrigger("Reports")).toHaveAttribute("aria-expanded", "false");
		});

		// The Analytics section is untouched by the consolidation (D-07 REVISED):
		// /analytics/financial stays live, so removing its child would orphan a
		// working page.
		it("lists the three Analytics children when Analytics is clicked", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);

			await user.click(getTrigger("Analytics"));

			expect(getTrigger("Analytics")).toHaveAttribute("aria-expanded", "true");
			for (const [name, href] of ANALYTICS_CHILDREN) {
				expect(screen.getByRole("link", { name })).toHaveAttribute(
					"href",
					href,
				);
			}
		});

		it("lists the seven Reports children when Reports is clicked", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);

			await user.click(getTrigger("Reports"));

			for (const [name, href] of REPORTS_CHILDREN) {
				expect(screen.getByRole("link", { name })).toHaveAttribute(
					"href",
					href,
				);
			}
		});

		it("opens Reports without a click when the pathname moves into it", () => {
			const { rerender } = render(<NavHarness />);
			expect(getTrigger("Reports")).toHaveAttribute("aria-expanded", "false");

			mockPathname.mockReturnValue("/reports/expenses");
			rerender(<NavHarness />);

			expect(getTrigger("Reports")).toHaveAttribute("aria-expanded", "true");
			expect(screen.getByRole("link", { name: "Expenses" })).toHaveAttribute(
				"aria-current",
				"page",
			);
		});
	});

	describe("templates section removal (Phase 65 D-09)", () => {
		// `getByText`'s default string match is EXACT, so a "Lease Template" label
		// would not satisfy this query even if it survived. After D-09 no
		// "Templates" text exists anywhere in this component at all.
		it("should NOT render a Templates section header", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);
			await openAllSections(user);

			expect(screen.queryByText("Templates")).not.toBeInTheDocument();
		});

		it("should NOT render Generate Lease link (Session 11 P3 #36: duplicate of Leases tab New Lease CTA)", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);
			await openAllSections(user);

			expect(
				screen.queryByRole("link", { name: /generate lease/i }),
			).not.toBeInTheDocument();
		});

		// One exhaustive assertion pinning THREE things at once: the core entry
		// points at /documents, the Lease Template link is gone, and no
		// /documents/* sidebar entry crept in. Both sections are opened first and
		// the total link count is pinned, so the sweep reads every child and
		// cannot pass vacuously.
		it("should surface exactly one /documents href in the whole sidebar", async () => {
			const user = userEvent.setup();
			const { container } = render(<NavHarness />);
			await openAllSections(user);

			const hrefs = Array.from(container.querySelectorAll("a")).map(
				(a) => a.getAttribute("href") ?? "",
			);
			expect(hrefs).toHaveLength(
				CORE.length + ANALYTICS_CHILDREN.length + REPORTS_CHILDREN.length + 2,
			);
			expect(hrefs).toHaveLength(19);
			expect(
				hrefs.filter(
					(href) => href === "/documents" || href.startsWith("/documents/"),
				),
			).toEqual(["/documents"]);
		});
	});

	describe("footer (D-38)", () => {
		function getFooter(): HTMLElement {
			const footer = document.querySelector<HTMLElement>(
				'[data-slot="sidebar-footer"]',
			);
			if (!footer) throw new Error("no sidebar footer");
			return footer;
		}

		it("holds exactly the Settings and Help & Support links", () => {
			render(<NavHarness />);

			const links = within(getFooter()).getAllByRole("link");
			expect(
				links.map((link) => [
					link.textContent?.trim(),
					link.getAttribute("href"),
				]),
			).toEqual([
				["Settings", "/settings"],
				["Help & Support", "/help"],
			]);
			expect(within(getFooter()).queryAllByRole("button")).toHaveLength(0);
		});

		it("marks Settings current on a settings route", () => {
			mockPathname.mockReturnValue("/settings/billing");
			render(<NavHarness />);

			const settings = within(getFooter()).getByRole("link", {
				name: "Settings",
			});
			expect(settings).toHaveAttribute("aria-current", "page");
			expect(settings).toHaveAttribute("data-active", "true");
		});

		it("never marks Help & Support current", () => {
			mockPathname.mockReturnValue("/help");
			render(<NavHarness />);

			const help = within(getFooter()).getByRole("link", {
				name: "Help & Support",
			});
			expect(help).not.toHaveAttribute("aria-current");
			expect(help).toHaveAttribute("data-active", "false");
		});

		it("drops the dead shortcuts item and its kbd hint", async () => {
			const user = userEvent.setup();
			const { container } = render(<NavHarness />);
			await openAllSections(user);

			expect(screen.queryByText(/keyboard shortcuts/i)).not.toBeInTheDocument();
			expect(screen.queryByText("?")).not.toBeInTheDocument();
			expect(container.querySelector("kbd")).toBeNull();
		});
	});

	describe("onNavigate callback (D-48)", () => {
		it.each([
			["a core link", "Properties", null],
			["a sub link", "Income Statement", "Reports"],
			["the Settings link", "Settings", null],
			["the Help & Support link", "Help & Support", null],
			["the Documents link", "Documents", null],
		] as const)(
			"calls onNavigate once for %s",
			async (_case, name, section) => {
				const user = userEvent.setup();
				const onNavigate = vi.fn();
				render(<NavHarness onNavigate={onNavigate} />);

				if (section) await user.click(getTrigger(section));
				const link = screen.getByRole("link", { name });
				// jsdom cannot navigate; cancel the default action only. React's
				// onClick (onNavigate) still runs.
				link.addEventListener("click", (event) => event.preventDefault());
				await user.click(link);

				expect(onNavigate).toHaveBeenCalledTimes(1);
			},
		);

		it("does not call onNavigate for a section toggle", async () => {
			const user = userEvent.setup();
			const onNavigate = vi.fn();
			render(<NavHarness onNavigate={onNavigate} />);

			await user.click(getTrigger("Analytics"));
			await user.click(getTrigger("Analytics"));

			expect(onNavigate).not.toHaveBeenCalled();
		});
	});

	describe("D-49 base-rule neutralizers (computed, never class presence)", () => {
		it("zeroes every sidebar list's padding-left, both margins and its items' margin", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);
			await openAllSections(user);

			const menus = document.querySelectorAll('ul[data-slot="sidebar-menu"]');
			const subs = document.querySelectorAll(
				'ul[data-slot="sidebar-menu-sub"]',
			);
			expect(menus).toHaveLength(3);
			expect(subs).toHaveLength(2);

			for (const list of [...menus, ...subs]) {
				const { neutralized, baseline } = computeListCascade(list);

				// POSITIVE CONTROL: an unclassed list under the same stylesheet. If
				// the harness failed to apply globals.css, these would read 0px and
				// the neutralization assertions would pass against nothing.
				expect(baseline.paddingLeft).toBe("24px");
				expect(baseline.marginTop).toBe("16px");
				expect(baseline.marginBottom).toBe("16px");
				expect(baseline.firstChildMarginBottom).toBe("4px");

				expect(neutralized.paddingLeft).toBe("0px");
				expect(neutralized.marginTop).toBe("0px");
				expect(neutralized.marginBottom).toBe("0px");
				expect(neutralized.firstChildTag).toBe("li");
				expect(neutralized.firstChildMarginBottom).toBe("0px");
			}
		});
	});

	describe("twMerge resolves the S-2 overrides", () => {
		it("drops the canonical row, sub row and sub list bases the overrides replace", async () => {
			const user = userEvent.setup();
			render(<NavHarness />);
			await openAllSections(user);

			const row = screen.getByRole("link", { name: "Dashboard" }).classList;
			for (const kept of ["h-10", "px-3", "rounded-lg", "[&>svg]:size-5"]) {
				expect(row.contains(kept)).toBe(true);
			}
			expect(row.contains("no-underline")).toBe(true);
			for (const dropped of ["h-8", "rounded-md", "gap-2", "[&>svg]:size-4"]) {
				expect(row.contains(dropped)).toBe(false);
			}

			const toggle = getTrigger("Reports").classList;
			expect(toggle.contains("h-10")).toBe(true);
			expect(toggle.contains("no-underline")).toBe(true);
			expect(toggle.contains("h-8")).toBe(false);

			const subRow = screen.getByRole("link", { name: "Overview" }).classList;
			expect(subRow.contains("h-9")).toBe(true);
			expect(subRow.contains("no-underline")).toBe(true);
			for (const dropped of [
				"h-7",
				"px-2",
				"-translate-x-px",
				"text-sidebar-foreground",
			]) {
				expect(subRow.contains(dropped)).toBe(false);
			}

			const subList = getList('ul[data-slot="sidebar-menu-sub"]', 0).classList;
			expect(subList.contains("ml-8")).toBe(true);
			expect(subList.contains("pl-0")).toBe(true);
			for (const dropped of ["mx-3.5", "border-l", "translate-x-px"]) {
				expect(subList.contains(dropped)).toBe(false);
			}
		});
	});

	describe("collapsed rail (D-34)", () => {
		it("makes the nav landmark inert when the desktop sidebar is collapsed", () => {
			render(<NavHarness defaultOpen={false} />);

			const nav = screen.getByRole("navigation", { hidden: true });
			expect(nav).toHaveAttribute("inert");
		});

		it("leaves the nav landmark live when the sidebar is expanded", () => {
			render(<NavHarness />);

			expect(screen.getByRole("navigation")).not.toHaveAttribute("inert");
		});

		it("makes the content and footer inert when the desktop sidebar is collapsed", () => {
			render(<NavHarness defaultOpen={false} />);

			const content = document.querySelector('[data-slot="sidebar-content"]');
			const footer = document.querySelector('[data-slot="sidebar-footer"]');
			expect(content).toHaveAttribute("inert");
			expect(footer).toHaveAttribute("inert");
			for (const link of document.querySelectorAll("a")) {
				expect(link.closest("[inert]")).not.toBeNull();
			}
			expect(
				screen
					.getByRole("link", { name: "Dashboard", hidden: true })
					.closest("[inert]"),
			).not.toBeNull();
		});

		it("leaves the content and footer live when the sidebar is expanded", () => {
			render(<NavHarness />);

			expect(
				document.querySelector('[data-slot="sidebar-content"]'),
			).not.toHaveAttribute("inert");
			expect(
				document.querySelector('[data-slot="sidebar-footer"]'),
			).not.toHaveAttribute("inert");
			expect(
				screen.getByRole("link", { name: "Dashboard" }).closest("[inert]"),
			).toBeNull();
		});
	});
});
