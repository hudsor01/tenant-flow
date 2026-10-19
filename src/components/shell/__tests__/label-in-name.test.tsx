/**
 * WCAG 2.5.3 Label in Name, as a unit invariant.
 *
 * axe-core 4.14 enabled `label-content-name-mismatch` by default and the
 * dashboard a11y e2e spec immediately failed on two shell buttons whose
 * aria-label REPLACED their accessible name with text that did not contain
 * what the user could see ("Search pages and actions…" vs "Open command
 * palette (...)", the user's initials vs "User menu"). A voice-control user
 * who says the visible label cannot activate such a control.
 *
 * The e2e spec only runs against production in CI. This test pins the rule
 * locally, at the leaf components, so the next aria-label that drifts from
 * its visible text fails pre-commit instead of a dependency PR.
 *
 * Visible text = the element's text minus `.sr-only` descendants, which are
 * by definition not visible. The accessible name must START with it: the
 * rule accepts any containment, but prefix is the robust form (screen readers
 * announce the visible words first, matching what sighted users read).
 */
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppShellSidebar } from "../app-shell-sidebar";
import { UserProfileMenu } from "../user-profile-menu";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

function visibleText(el: HTMLElement): string {
	const clone = el.cloneNode(true) as HTMLElement;
	for (const hidden of clone.querySelectorAll(".sr-only")) hidden.remove();
	return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts via the same accessible-name computation Testing Library uses to
 * resolve `getByRole(..., { name })` -- the mechanism this suite already
 * trusts (app-shell.test.tsx selects the user menu exactly this way). The
 * query throws with the full list of candidate names when nothing matches,
 * which is a better failure message than a bare matcher.
 */
function expectLabelInName(el: HTMLElement) {
	const visible = visibleText(el);
	if (!visible) return; // icon-only controls are labelled by aria-label alone; the rule does not apply
	const role =
		el.getAttribute("role") ?? (el.tagName === "A" ? "link" : "button");
	const matches = screen.getAllByRole(role, {
		name: new RegExp(`^${escapeRegExp(visible)}`),
	});
	expect(matches).toContain(el);
}

describe("WCAG 2.5.3 Label in Name — shell controls", () => {
	it("command palette trigger: accessible name starts with its visible text", () => {
		render(
			<AppShellSidebar
				sidebarRef={createRef<HTMLElement>()}
				sidebarOpen={true}
				closeSidebar={vi.fn()}
				onCommandOpen={vi.fn()}
			/>,
		);
		const trigger = screen.getByRole("button", {
			name: /^Search pages and actions…/,
		});
		expectLabelInName(trigger);
		// The screen-reader hint survives as a suffix rather than replacing the name.
		expect(
			screen.getByRole("button", { name: /opens the command palette/ }),
		).toBe(trigger);
	});

	it("user menu trigger: accessible name starts with the visible initials and still says 'user menu'", () => {
		render(
			<UserProfileMenu
				userInitials="JS"
				userName="Jane Smith"
				userEmail="jane@example.com"
				profileHref="/profile"
				settingsHref="/settings"
				onSignOut={vi.fn()}
			/>,
		);
		const trigger = screen.getByRole("button", { name: /user menu/i });
		expectLabelInName(trigger);
		expect(screen.getByRole("button", { name: /^JS\b/ })).toBe(trigger);
	});

	it("every shell button with visible text keeps that text in its accessible name", () => {
		render(
			<AppShellSidebar
				sidebarRef={createRef<HTMLElement>()}
				sidebarOpen={true}
				closeSidebar={vi.fn()}
				onCommandOpen={vi.fn()}
			/>,
		);
		for (const el of screen.getAllByRole("button")) expectLabelInName(el);
		for (const el of screen.getAllByRole("link")) expectLabelInName(el);
	});
});
