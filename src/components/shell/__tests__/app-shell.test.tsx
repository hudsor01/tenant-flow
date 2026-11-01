/**
 * AppShell Component Tests
 *
 * Tests the main application shell component including:
 * - Basic rendering
 * - Desktop sidebar (D-34, D-35, D-37): one main#main-content, no hand-rolled
 *   offset/overlay/inset, the named header trigger, collapse with an inert
 *   header and a live rail, the cookie-driven default, the sidebar-primary tile
 * - Mobile navigation sheet (D-41, D-46, D-48): the named Radix dialog with
 *   hideOthers, the one visible 44px close button, close on Escape / close
 *   button / nav item / logo / palette selection with focus back on the trigger
 * - Focus return under StrictMode (D-47)
 * - User profile dropdown
 * - Command palette, including the nav-sheet exclusion in the Cmd+K guard
 * - Quick actions dock
 * - Breadcrumbs
 */

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	SIDEBAR_TOUR_RAIL_SELECTOR,
	SIDEBAR_TOUR_TRIGGER_SELECTOR,
} from "#components/tours/sidebar-tour-target";
import { MOBILE_MEDIA_QUERY } from "#hooks/use-mobile";
import { AppShell } from "../app-shell";

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue("/dashboard");
const mockRouter = {
	push: vi.fn(),
	back: vi.fn(),
};
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
	useRouter: () => mockRouter,
}));

// Mock auth hooks
const mockUser = {
	id: "test-user-id",
	email: "owner@example.com",
	user_metadata: {
		full_name: "Jane Smith",
	},
};
const mockSignOutMutation = { mutate: vi.fn() };

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseUser: () => ({ data: mockUser }),
}));

vi.mock("#hooks/api/use-auth-mutations", () => ({
	useSignOutMutation: () => mockSignOutMutation,
}));

// Mock property and tenant list hooks
const mockProperties = [
	{ id: "prop-1", name: "Sunset Apartments", city: "Los Angeles", state: "CA" },
	{ id: "prop-2", name: "Ocean View", city: "San Diego", state: "CA" },
];

const mockTenants = [
	{
		id: "tenant-1",
		first_name: "John",
		last_name: "Doe",
		email: "john@example.com",
	},
	{
		id: "tenant-2",
		first_name: "Sarah",
		last_name: "Wilson",
		email: "sarah@example.com",
	},
];

vi.mock("#hooks/api/use-properties", () => ({
	usePropertyList: () => ({ data: mockProperties }),
}));

vi.mock("#hooks/api/use-tenant", () => ({
	useTenantList: () => ({ data: { data: mockTenants } }),
}));

// Mock MainNav component
vi.mock("../main-nav", () => ({
	MainNav: ({ onNavigate }: { onNavigate: () => void }) => (
		<nav data-testid="main-nav">
			<button onClick={onNavigate} type="button">
				Mock Nav Item
			</button>
		</nav>
	),
}));

// Mock QuickActionsDock component
vi.mock("../quick-actions-dock", () => ({
	QuickActionsDock: () => (
		<div data-testid="quick-actions-dock">Quick Actions</div>
	),
}));

// Mock GlobalSyncIndicator to avoid needing QueryClientProvider
vi.mock("#components/ui/global-sync-indicator", () => ({
	GlobalSyncIndicator: () => (
		<div data-testid="global-sync-indicator">Saved</div>
	),
}));

// Mock NotificationBell (a client island that polls via useQuery) to avoid
// needing a QueryClientProvider in the shell render harness. Uses the label
// "Bell" (not "Notifications") so it never collides with the command-palette
// "Notifications" entry in getByText queries.
vi.mock("#components/notifications/notification-bell", () => ({
	NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

// Mock scrollIntoView for command palette (JSDOM doesn't support it)
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// The unit setup answers every media query with `matches: false` (desktop).
// Mobile tests stub only the sidebar's breakpoint query as matching.
function stubViewport(mobile: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: mobile && query === MOBILE_MEDIA_QUERY,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(() => true),
	}));
}

// The rail shares the trigger's accessible name, so the header trigger is
// selected by its data-slot, never by name alone.
function getTrigger(container: HTMLElement): HTMLButtonElement {
	const trigger = container.querySelector('[data-slot="sidebar-trigger"]');
	if (!(trigger instanceof HTMLButtonElement)) {
		throw new Error("sidebar trigger not found");
	}
	return trigger;
}

// Captures the trigger before opening: Radix hideOthers hides it from role
// queries while the sheet is open. The first client render is the desktop
// branch, so the click waits until the trigger reports the closed sheet.
async function openSheet(container: HTMLElement, user: UserEvent) {
	const trigger = getTrigger(container);
	await waitFor(() =>
		expect(trigger).toHaveAttribute("aria-expanded", "false"),
	);
	await user.click(trigger);
	const dialog = await screen.findByRole("dialog", { name: "Navigation menu" });
	return { trigger, dialog };
}

describe("AppShell", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.mockReturnValue("/dashboard");
	});

	describe("basic rendering", () => {
		it("should render children content", () => {
			render(
				<AppShell>
					<div data-testid="child-content">Child Content</div>
				</AppShell>,
			);

			expect(screen.getByTestId("child-content")).toBeInTheDocument();
		});

		it("should render TenantFlow logo", () => {
			render(<AppShell>Content</AppShell>);

			expect(screen.getByText("TenantFlow")).toBeInTheDocument();
		});

		it("should render MainNav component", () => {
			render(<AppShell>Content</AppShell>);

			expect(screen.getByTestId("main-nav")).toBeInTheDocument();
		});

		it("should render search button", () => {
			render(<AppShell>Content</AppShell>);

			expect(screen.getByText("Search pages and actions…")).toBeInTheDocument();
		});

		it("should render keyboard shortcut hint", () => {
			render(<AppShell>Content</AppShell>);

			expect(screen.getByText("K")).toBeInTheDocument();
		});
	});

	describe("quick actions dock", () => {
		it("should render QuickActionsDock by default", () => {
			render(<AppShell>Content</AppShell>);

			expect(screen.getByTestId("quick-actions-dock")).toBeInTheDocument();
		});

		it("should not render QuickActionsDock when showQuickActionsDock is false", () => {
			render(<AppShell showQuickActionsDock={false}>Content</AppShell>);

			expect(
				screen.queryByTestId("quick-actions-dock"),
			).not.toBeInTheDocument();
		});

		// The lg:pb-(--dock-clearance) bottom clearance on <main> is gated by
		// the SAME dockVisible condition as the dock itself, so form/create
		// routes (where the dock is suppressed) get no dead space at the end.
		it("reserves the dock clearance only when the dock is visible", () => {
			const { container } = render(<AppShell>Content</AppShell>);
			expect(screen.getByTestId("quick-actions-dock")).toBeInTheDocument();
			const tokens =
				container.querySelector("#main-content")?.className.split(/\s+/) ?? [];
			expect(tokens).toContain("lg:pb-(--dock-clearance)");
			expect(tokens).not.toContain("lg:pb-28");
		});

		// The dock's collapsed-centering variant keys on the
		// group/sidebar-wrapper element, so the dock must render inside it (D-39).
		it("renders the dock inside the sidebar wrapper", () => {
			render(<AppShell>Content</AppShell>);

			expect(
				screen
					.getByTestId("quick-actions-dock")
					.closest('[data-slot="sidebar-wrapper"]'),
			).not.toBeNull();
		});

		it("drops both the dock and its clearance on /new routes", () => {
			mockPathname.mockReturnValue("/properties/new");
			const { container } = render(<AppShell>Content</AppShell>);
			expect(
				screen.queryByTestId("quick-actions-dock"),
			).not.toBeInTheDocument();
			expect(container.querySelector("#main-content")?.className).not.toContain(
				"--dock-clearance",
			);
		});
	});

	describe("desktop sidebar", () => {
		it("renders exactly one main#main-content and no hand-rolled offset, overlay or inset", () => {
			const { container } = render(<AppShell>Content</AppShell>);

			const mains = container.querySelectorAll("main");
			expect(mains).toHaveLength(1);
			expect(mains[0]).toHaveAttribute("id", "main-content");
			expect(container.querySelector('[class~="lg:pl-56"]')).toBeNull();
			expect(container.querySelector(".fixed.inset-0.z-40")).toBeNull();
			expect(container.querySelector('[data-slot="sidebar-inset"]')).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Open navigation menu" }),
			).not.toBeInTheDocument();
		});

		it("names the header trigger and reports the expanded rail", () => {
			const { container } = render(<AppShell>Content</AppShell>);

			const trigger = getTrigger(container);
			expect(trigger).toHaveAccessibleName("Toggle navigation menu");
			expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(screen.getByRole("complementary")).toHaveAttribute(
				"data-tour",
				"sidebar-nav",
			);
			expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
				"data-state",
				"expanded",
			);
		});

		it("collapses the rail with an inert header and a live rail, then restores it", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);
			const trigger = getTrigger(container);
			const sidebar = container.querySelector('[data-slot="sidebar"]');
			const header = container.querySelector('[data-slot="sidebar-header"]');
			const rail = container.querySelector('[data-slot="sidebar-rail"]');
			const logo = screen.getByRole("link", { name: "TenantFlow" });

			await user.click(trigger);

			expect(sidebar).toHaveAttribute("data-state", "collapsed");
			expect(trigger).toHaveAttribute("aria-expanded", "false");
			expect(header).toHaveAttribute("inert");
			expect(logo.closest("[inert]")).not.toBeNull();
			expect(rail?.closest("[inert]")).toBeNull();
			expect(
				container.querySelector('[data-tour="sidebar-nav"]'),
			).not.toHaveAttribute("inert");

			await user.click(trigger);

			expect(sidebar).toHaveAttribute("data-state", "expanded");
			expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(header).not.toHaveAttribute("inert");
		});

		it("renders collapsed on first render when defaultSidebarOpen is false", () => {
			const { container } = render(
				<AppShell defaultSidebarOpen={false}>Content</AppShell>,
			);

			expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
				"data-state",
				"collapsed",
			);
			expect(getTrigger(container)).toHaveAttribute("aria-expanded", "false");
		});

		it("renders one rail handle and the sidebar-primary logo tile", () => {
			const { container } = render(<AppShell>Content</AppShell>);

			const rails = container.querySelectorAll('[data-slot="sidebar-rail"]');
			expect(rails).toHaveLength(1);
			expect(rails[0]?.tagName).toBe("BUTTON");

			const logo = screen.getByRole("link", { name: "TenantFlow" });
			const tile = logo.querySelector("div");
			expect(tile).toHaveClass("bg-sidebar-primary");
			expect(tile).not.toHaveClass("bg-primary");
			expect(tile?.querySelector("svg")).toHaveClass(
				"text-sidebar-primary-foreground",
			);
		});
	});

	describe("mobile navigation sheet", () => {
		beforeEach(() => {
			stubViewport(true);
		});

		it("opens a named, described Radix sheet that hides the rest of the page", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);

			const { dialog } = await openSheet(container, user);

			expect(dialog).toHaveAccessibleDescription(
				"Main navigation for your TenantFlow account",
			);
			expect(dialog).toHaveAttribute("data-slot", "sidebar");
			expect(dialog).not.toHaveAttribute("aria-modal");
			expect(
				document
					.getElementById("main-content")
					?.closest('[aria-hidden="true"]'),
			).not.toBeNull();
			expect(document.querySelectorAll("main")).toHaveLength(1);
		});

		it("does not focus the trigger when the first render switches into sheet mode", async () => {
			const { container } = render(<AppShell>Content</AppShell>);
			const trigger = getTrigger(container);

			// The desktop branch unmounts once matchMedia reports the sheet mode.
			await waitFor(() =>
				expect(trigger).toHaveAttribute("aria-expanded", "false"),
			);
			await act(
				() =>
					new Promise<void>((resolve) => {
						setTimeout(resolve, 0);
					}),
			);

			expect(document.activeElement).not.toBe(trigger);
		});

		it("shows one labelled 44px close button and keeps the sheet's own close hidden", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);

			const { dialog } = await openSheet(container, user);

			const closeButtons = within(dialog).getAllByRole("button", {
				name: "Close navigation menu",
			});
			expect(closeButtons).toHaveLength(1);
			expect(closeButtons[0]).toHaveClass(
				"min-h-11",
				"min-w-11",
				"rounded-md",
				"hover:bg-muted",
				"lg:hidden",
			);
			const sheetClose = within(dialog).getByRole("button", { name: "Close" });
			expect(sheetClose.parentElement).toBe(dialog);
			expect(dialog).toHaveClass("[&>button]:hidden");
		});

		it.each([
			["Escape", async (user: UserEvent) => user.keyboard("{Escape}")],
			[
				"the close button",
				async (user: UserEvent) =>
					user.click(
						screen.getByRole("button", { name: "Close navigation menu" }),
					),
			],
			[
				"a nav item",
				async (user: UserEvent) =>
					user.click(screen.getByRole("button", { name: "Mock Nav Item" })),
			],
			[
				"the logo link",
				async (user: UserEvent) => {
					const logo = screen.getByRole("link", { name: "TenantFlow" });
					// jsdom cannot navigate; cancel the default action only. React's
					// onClick (closeMobile) still runs.
					logo.addEventListener("click", (event) => event.preventDefault());
					await user.click(logo);
				},
			],
		])(
			"closes on %s and returns focus to the trigger",
			async (_name, close) => {
				const user = userEvent.setup();
				const { container } = render(<AppShell>Content</AppShell>);
				const { trigger } = await openSheet(container, user);

				await close(user);

				await waitFor(() =>
					expect(
						screen.queryByRole("dialog", { name: "Navigation menu" }),
					).not.toBeInTheDocument(),
				);
				await waitFor(() => expect(document.activeElement).toBe(trigger));
			},
		);

		it("navigates from a palette selection made over the sheet and closes both", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);
			const { trigger } = await openSheet(container, user);

			await user.click(screen.getByText("Search pages and actions…"));
			expect(
				screen.getByPlaceholderText("Search pages and actions..."),
			).toBeInTheDocument();

			await user.click(screen.getByRole("option", { name: /dashboard/i }));

			expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("Search pages and actions..."),
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole("dialog", { name: "Navigation menu" }),
				).not.toBeInTheDocument();
			});
			await waitFor(() => expect(document.activeElement).toBe(trigger));
		});

		it("opens the palette over the sheet with Cmd+K and closes only the palette on Escape", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);
			await openSheet(container, user);

			fireEvent.keyDown(window, { key: "k", metaKey: true });
			const input = screen.getByPlaceholderText("Search pages and actions...");
			expect(input).toBeInTheDocument();

			await user.keyboard("{Escape}");

			await waitFor(() =>
				expect(
					screen.queryByPlaceholderText("Search pages and actions..."),
				).not.toBeInTheDocument(),
			);
			expect(
				screen.getByRole("dialog", { name: "Navigation menu" }),
			).toBeInTheDocument();
		});
	});

	describe("focus return under StrictMode", () => {
		beforeEach(() => {
			stubViewport(true);
		});

		it("keeps focus inside the opened sheet, then returns it to the trigger on Escape", async () => {
			const user = userEvent.setup();
			const { container } = render(
				<StrictMode>
					<AppShell>Content</AppShell>
				</StrictMode>,
			);
			// Radix's focus trap would pull a stolen focus straight back into the
			// sheet, so count the trigger's focus events as well: the click
			// focuses it once, and the simulated unmount must not focus it again.
			let triggerFocusCount = 0;
			getTrigger(container).addEventListener("focus", () => {
				triggerFocusCount += 1;
			});
			const { trigger, dialog } = await openSheet(container, user);

			await act(
				() =>
					new Promise<void>((resolve) => {
						setTimeout(resolve, 0);
					}),
			);

			expect(dialog.contains(document.activeElement)).toBe(true);
			expect(document.activeElement).not.toBe(trigger);
			expect(triggerFocusCount).toBe(1);

			await user.keyboard("{Escape}");

			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Navigation menu" }),
				).not.toBeInTheDocument(),
			);
			await waitFor(() => expect(document.activeElement).toBe(trigger));
		});
	});

	describe("user profile", () => {
		it("should display user initials", () => {
			render(<AppShell>Content</AppShell>);

			// "Jane Smith" -> "JS"
			expect(screen.getByText("JS")).toBeInTheDocument();
		});

		it("should display user name in dropdown", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			const avatarButton = screen.getByRole("button", { name: /user menu/i });
			await user.click(avatarButton);

			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
		});

		it("should display user email in dropdown", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			const avatarButton = screen.getByRole("button", { name: /user menu/i });
			await user.click(avatarButton);

			expect(screen.getByText("owner@example.com")).toBeInTheDocument();
		});

		it("should show dropdown menu on profile button click", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);

			// Find the dropdown trigger by its aria-haspopup attribute
			const dropdownTrigger = container.querySelector(
				'button[aria-haspopup="menu"]',
			);
			expect(dropdownTrigger).toBeInTheDocument();
			await user.click(dropdownTrigger as HTMLElement);

			expect(
				screen.getByRole("menuitem", { name: /settings/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("menuitem", { name: /profile/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("menuitem", { name: /sign out/i }),
			).toBeInTheDocument();
		});

		it("should call signOut when Sign out is clicked", async () => {
			const user = userEvent.setup();
			const { container } = render(<AppShell>Content</AppShell>);

			// Open dropdown
			const dropdownTrigger = container.querySelector(
				'button[aria-haspopup="menu"]',
			);
			await user.click(dropdownTrigger as HTMLElement);

			// Click sign out
			const signOutItem = screen.getByRole("menuitem", { name: /sign out/i });
			await user.click(signOutItem);

			expect(mockSignOutMutation.mutate).toHaveBeenCalledTimes(1);
		});
	});

	describe("header", () => {
		it("should render the NotificationBell island", () => {
			render(<AppShell>Content</AppShell>);

			// The header now mounts the interactive NotificationBell client island
			// (NOTIF-02) in place of the former /settings?tab=notifications link.
			expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
		});
	});

	describe("breadcrumbs", () => {
		it("should render breadcrumbs for nested paths", () => {
			mockPathname.mockReturnValue("/properties/123");
			render(<AppShell>Content</AppShell>);

			// Breadcrumbs now always visible (aria-label="Breadcrumb")
			const breadcrumbNav = screen.getByRole("navigation", {
				name: "Breadcrumb",
			});
			expect(breadcrumbNav).toBeInTheDocument();

			// Check for breadcrumb labels within the breadcrumb nav
			// The breadcrumb utility generates "Properties > 123" for /properties/123
			expect(within(breadcrumbNav).getByText("Properties")).toBeInTheDocument();
		});

		it("should render breadcrumb links for parent paths", () => {
			mockPathname.mockReturnValue("/properties/123");
			render(<AppShell>Content</AppShell>);

			const breadcrumbNav = screen.getByRole("navigation", {
				name: "Breadcrumb",
			});
			const propertiesLink = within(breadcrumbNav).getByRole("link", {
				name: "Properties",
			});
			expect(propertiesLink).toHaveAttribute("href", "/properties");
		});
	});

	describe("command palette", () => {
		it("should open command palette when search button is clicked", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Click the search button
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			// Command palette should be open
			expect(
				screen.getByPlaceholderText("Search pages and actions..."),
			).toBeInTheDocument();
		});

		it("should show navigation groups in command palette", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Open command palette
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			// Check for group headings (some text may appear multiple times)
			expect(screen.getByText("Navigation")).toBeInTheDocument();
			expect(screen.getByText("Analytics & Reports")).toBeInTheDocument();
			// Phase 56 (D-29): the separate statements heading is gone — its rows
			// folded into "Analytics & Reports" when the legacy tree was deleted.
			// The palette's full href list is pinned in app-shell-nav.test.tsx.
			expect(screen.getByText("Income Statement")).toBeInTheDocument();
			// v2.4 Phase 60 renamed the legacy "Documents" command-palette
			// heading to "Templates" — the new top-level "Documents" core
			// nav item points at /documents/vault.
			expect(screen.getAllByText("Templates").length).toBeGreaterThanOrEqual(1);
			// Cycle-3 L5: /documents/vault must be reachable from cmd+K
			// Navigation group. MainNav is mocked at the top of this file
			// so the only "Documents" in the DOM comes from the cmd+K
			// palette itself. Cycle-5 LOW-1: pin to exact length 1 — a
			// future regression that adds the entry to a different group
			// (e.g., moves it from Navigation → Templates) would still
			// satisfy `>= 1` but fail this stricter assertion.
			expect(screen.getAllByText("Documents")).toHaveLength(1);
		});

		it("should show recent properties in command palette", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Open command palette
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			expect(screen.getByText("Recent Properties")).toBeInTheDocument();
			expect(screen.getByText("Sunset Apartments")).toBeInTheDocument();
			expect(screen.getByText("Ocean View")).toBeInTheDocument();
		});

		it("should show recent tenants in command palette", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Open command palette
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			expect(screen.getByText("Recent Tenants")).toBeInTheDocument();
			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
		});

		it("should show Account & Support section in command palette", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Open command palette
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			expect(screen.getByText("Account & Support")).toBeInTheDocument();
			expect(screen.getByText("Notifications")).toBeInTheDocument();
			expect(screen.getByText("Help & Support")).toBeInTheDocument();
		});

		it("should close command palette and navigate when item is selected", async () => {
			const user = userEvent.setup();
			render(<AppShell>Content</AppShell>);

			// Open command palette
			const searchButton = screen.getByText("Search pages and actions…");
			await user.click(searchButton);

			// Click on Dashboard navigation item
			const dashboardItem = screen.getByRole("option", { name: /dashboard/i });
			await user.click(dashboardItem);

			expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
		});

		it("should open command palette with keyboard shortcut", async () => {
			render(<AppShell>Content</AppShell>);

			// Simulate Cmd+K (or Ctrl+K)
			fireEvent.keyDown(window, { key: "k", metaKey: true });

			// Command palette should be open
			expect(
				screen.getByPlaceholderText("Search pages and actions..."),
			).toBeInTheDocument();
		});

		it("ignores a keydown with no key (Chrome autofill) without throwing", () => {
			const errors: unknown[] = [];
			const onError = (event: ErrorEvent) => {
				errors.push(event.error);
				event.preventDefault();
			};
			window.addEventListener("error", onError);
			try {
				render(<AppShell>Content</AppShell>);
				// Chrome's autofill dispatches a plain Event named keydown: no `key`.
				const autofill = new Event("keydown", {
					bubbles: true,
					cancelable: true,
				});
				expect(window.dispatchEvent(autofill)).toBe(true);
				expect(errors).toEqual([]);
				expect(
					screen.queryByPlaceholderText("Search pages and actions..."),
				).not.toBeInTheDocument();
				// Positive control: the listener is attached and still opens on Cmd+K.
				fireEvent.keyDown(window, { key: "k", metaKey: true });
				expect(
					screen.getByPlaceholderText("Search pages and actions..."),
				).toBeInTheDocument();
			} finally {
				window.removeEventListener("error", onError);
			}
		});

		it("should close command palette with keyboard shortcut", async () => {
			render(<AppShell>Content</AppShell>);

			// Open command palette
			fireEvent.keyDown(window, { key: "k", metaKey: true });

			// Verify it's open
			expect(
				screen.getByPlaceholderText("Search pages and actions..."),
			).toBeInTheDocument();

			// Toggle it closed
			fireEvent.keyDown(window, { key: "k", metaKey: true });

			// Command palette should be closed
			expect(
				screen.queryByPlaceholderText("Search pages and actions..."),
			).not.toBeInTheDocument();
		});

		// Cycle-2 review P3-2: Session 11 P2 #17 — Cmd+K must not open
		// the command palette while another role=dialog is open (e.g. the
		// onboarding wizard). Pin the suppression so future refactors
		// can't regress it back to a stacked-dialog state.
		it("does NOT open the command palette while another dialog[data-state=open] is mounted", () => {
			const blockingDialog = document.createElement("div");
			blockingDialog.setAttribute("role", "dialog");
			blockingDialog.setAttribute("data-state", "open");
			document.body.appendChild(blockingDialog);

			try {
				render(<AppShell>Content</AppShell>);

				fireEvent.keyDown(window, { key: "k", metaKey: true });

				expect(
					screen.queryByPlaceholderText("Search pages and actions..."),
				).not.toBeInTheDocument();
			} finally {
				blockingDialog.remove();
			}
		});

		it("does not treat the open nav sheet (data-slot=sidebar) as a blocking dialog", () => {
			const navSheet = document.createElement("div");
			navSheet.setAttribute("role", "dialog");
			navSheet.setAttribute("data-state", "open");
			navSheet.setAttribute("data-slot", "sidebar");
			document.body.appendChild(navSheet);

			try {
				render(<AppShell>Content</AppShell>);

				fireEvent.keyDown(window, { key: "k", metaKey: true });

				expect(
					screen.getByPlaceholderText("Search pages and actions..."),
				).toBeInTheDocument();
			} finally {
				navSheet.remove();
			}
		});

		it("opens the command palette once the blocking dialog is removed", () => {
			const blockingDialog = document.createElement("div");
			blockingDialog.setAttribute("role", "dialog");
			blockingDialog.setAttribute("data-state", "open");
			document.body.appendChild(blockingDialog);

			render(<AppShell>Content</AppShell>);

			// First press is blocked.
			fireEvent.keyDown(window, { key: "k", metaKey: true });
			expect(
				screen.queryByPlaceholderText("Search pages and actions..."),
			).not.toBeInTheDocument();

			// Remove the blocker, retry, palette opens.
			blockingDialog.remove();
			fireEvent.keyDown(window, { key: "k", metaKey: true });
			expect(
				screen.getByPlaceholderText("Search pages and actions..."),
			).toBeInTheDocument();
		});
	});

	describe("sidebar tour attribute", () => {
		it("should have data-tour attribute for sidebar", () => {
			render(<AppShell>Content</AppShell>);

			const sidebar = screen.getByRole("complementary");
			expect(sidebar).toHaveAttribute("data-tour", "sidebar-nav");
		});
	});

	// Tour step 5 points at one of these two anchors (D-39). The trigger is
	// found by data-slot, never by name: the rail shares its accessible name.
	describe("tour anchors (D-39)", () => {
		it("resolves the trigger and rail selectors in the desktop shell", () => {
			const { container } = render(<AppShell>Content</AppShell>);

			const trigger = getTrigger(container);
			expect(document.querySelector(SIDEBAR_TOUR_TRIGGER_SELECTOR)).toBe(
				trigger,
			);
			expect(trigger).toHaveAccessibleName("Toggle navigation menu");
			expect(document.querySelector(SIDEBAR_TOUR_RAIL_SELECTOR)).not.toBeNull();
		});
	});
});
