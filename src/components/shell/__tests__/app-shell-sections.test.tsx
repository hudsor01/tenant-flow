/**
 * AppShell sidebar sections against the REAL MainNav (66.2 CONTEXT D-50,
 * RESEARCH P10).
 *
 * The section open state is lifted into the AppShell inner child through
 * `useNavSectionState`, because the mobile Sheet unmounts its content when it
 * closes: state held inside the nav would reset on every close. These cases
 * prove the lift end to end: the active section is open on desktop, a section
 * opened by hand is still open after the sheet closes and reopens, and
 * navigating into a section opens it in the sheet.
 *
 * WHY A SEPARATE FILE. `app-shell.test.tsx` mocks `../main-nav` file-wide with
 * a one-button stub for its close-path tests, and a hoisted `vi.mock` cannot be
 * undone for one describe. This file never mocks `../main-nav` or
 * `../app-shell-search`, so the real nav and palette render.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
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

vi.mock("#hooks/api/use-auth", () => ({
	useSupabaseUser: () => ({
		data: {
			id: "test-user-id",
			email: "owner@example.com",
			user_metadata: { full_name: "Jane Smith" },
		},
	}),
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

vi.mock("../quick-actions-dock", () => ({
	QuickActionsDock: () => (
		<div data-testid="quick-actions-dock">Quick Actions</div>
	),
}));

vi.mock("#components/ui/global-sync-indicator", () => ({
	GlobalSyncIndicator: () => (
		<div data-testid="global-sync-indicator">Saved</div>
	),
}));

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

function getSectionTrigger(scope: HTMLElement, label: string): HTMLElement {
	const trigger = Array.from(
		scope.querySelectorAll<HTMLElement>('[data-slot="collapsible-trigger"]'),
	).find((el) => el.textContent?.trim() === label);
	if (!trigger) throw new Error(`no section trigger named ${label}`);
	return trigger;
}

describe("sidebar sections (D-50, P10)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.mockReturnValue("/dashboard");
	});

	it("opens the section holding the active route on desktop (D-50)", () => {
		mockPathname.mockReturnValue("/reports/cash-flow");
		const { container } = render(<AppShell>Content</AppShell>);

		const sidebar = container.querySelector('[data-slot="sidebar"]');
		if (!(sidebar instanceof HTMLElement)) {
			throw new Error("sidebar not rendered");
		}
		expect(getSectionTrigger(sidebar, "Reports")).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(
			within(sidebar).getByRole("link", { name: "Cash Flow" }),
		).toHaveAttribute("aria-current", "page");
		expect(getSectionTrigger(sidebar, "Analytics")).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	it("keeps a manually opened section open across the sheet unmount (D-50, P10)", async () => {
		stubViewport(true);
		const user = userEvent.setup();
		const { container } = render(<AppShell>Content</AppShell>);

		const first = await openSheet(container, user);
		await user.click(getSectionTrigger(first.dialog, "Analytics"));
		expect(
			within(first.dialog).getByRole("link", { name: "Overview" }),
		).toBeInTheDocument();

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Navigation menu" }),
			).not.toBeInTheDocument(),
		);
		// The sheet unmounted its content: no sub link is left in the document.
		expect(
			screen.queryByRole("link", { name: "Overview", hidden: true }),
		).not.toBeInTheDocument();

		const second = await openSheet(container, user);
		expect(second.trigger).toBe(first.trigger);
		expect(getSectionTrigger(second.dialog, "Analytics")).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(
			within(second.dialog).getByRole("link", { name: "Overview" }),
		).toBeInTheDocument();
	});

	it("opens the entered section in the sheet after a navigation (D-50)", async () => {
		stubViewport(true);
		const user = userEvent.setup();
		const { container, rerender } = render(<AppShell>Content</AppShell>);

		mockPathname.mockReturnValue("/reports/expenses");
		rerender(<AppShell>Content</AppShell>);

		const { dialog } = await openSheet(container, user);
		expect(getSectionTrigger(dialog, "Reports")).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(
			within(dialog).getByRole("link", { name: "Expenses" }),
		).toHaveAttribute("aria-current", "page");
	});
});
