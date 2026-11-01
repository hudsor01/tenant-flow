/**
 * Contract for the hand-vendored `#components/ui/sidebar` primitive (66.2-32):
 * provider state, the `sidebar_state` cookie write, trigger and rail, the
 * Cmd/Ctrl+B shortcut guards (D-52), the collapsed `inert` regions (D-34), the
 * mobile sheet (D-41 / D-46) and the desktop / none / floating branches.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from "#components/ui/sidebar";
import { MOBILE_MEDIA_QUERY } from "#hooks/use-mobile";
import { computeListCascade } from "#test/utils/base-rule-cascade";

const cookieGet = vi.fn(() => "");
const cookieSet = vi.fn();
Object.defineProperty(document, "cookie", {
	get: cookieGet,
	set: cookieSet,
	configurable: true,
});

const savedMatchMedia = window.matchMedia;

function stubMobile(): void {
	window.matchMedia = vi.fn((query: string) => ({
		matches: query === MOBILE_MEDIA_QUERY,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

beforeEach(() => {
	cookieSet.mockClear();
	cookieGet.mockClear();
});

afterEach(() => {
	window.matchMedia = savedMatchMedia;
});

function StateProbe() {
	const { state, open, openMobile, isMobile, setOpen } = useSidebar();
	return (
		<div>
			<span data-testid="state">{state}</span>
			<span data-testid="open">{String(open)}</span>
			<span data-testid="open-mobile">{String(openMobile)}</span>
			<span data-testid="is-mobile">{String(isMobile)}</span>
			<button type="button" onClick={() => setOpen(false)}>
				Collapse directly
			</button>
		</div>
	);
}

function Shell({
	defaultOpen,
	children,
}: {
	defaultOpen?: boolean;
	children?: ReactNode;
}) {
	return (
		<SidebarProvider {...(defaultOpen !== undefined && { defaultOpen })}>
			<Sidebar>
				<SidebarHeader>
					<a href="/dashboard">Header link</a>
				</SidebarHeader>
				<SidebarContent>
					<a href="/properties">Content link</a>
				</SidebarContent>
				<SidebarFooter>
					<a href="/settings">Footer link</a>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<SidebarTrigger />
			<StateProbe />
			{children}
		</SidebarProvider>
	);
}

function getDesktopSidebar(container: HTMLElement): HTMLElement {
	const el = container.querySelector<HTMLElement>('[data-slot="sidebar"]');
	if (!el) throw new Error("no desktop sidebar rendered");
	return el;
}

function getSlot(container: ParentNode, slot: string): HTMLElement {
	const el = container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
	if (!el) throw new Error(`no [data-slot="${slot}"] rendered`);
	return el;
}

const STATE = () => screen.getByTestId("state").textContent;

describe("useSidebar", () => {
	it("throws outside a SidebarProvider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<StateProbe />)).toThrow(
			"useSidebar must be used within a SidebarProvider.",
		);
		spy.mockRestore();
	});
});

describe("SidebarProvider and Sidebar (desktop)", () => {
	it("renders the wrapper with no inline width custom property", () => {
		const { container } = render(<Shell />);
		const wrapper = getSlot(container, "sidebar-wrapper");
		expect(wrapper).toHaveClass("group/sidebar-wrapper");
		expect(wrapper.hasAttribute("style")).toBe(false);
		const outer = getDesktopSidebar(container);
		const inner = getSlot(container, "sidebar-container");
		for (const el of [wrapper, outer, inner]) {
			expect(el.style.getPropertyValue("--sidebar-width")).toBe("");
		}
	});

	it("defaults to expanded with an empty data-collapsible", () => {
		const { container } = render(<Shell />);
		const outer = getDesktopSidebar(container);
		expect(outer).toHaveAttribute("data-state", "expanded");
		expect(outer).toHaveAttribute("data-collapsible", "");
		expect(STATE()).toBe("expanded");
	});

	it("starts collapsed off-canvas with defaultOpen={false}", () => {
		const { container } = render(<Shell defaultOpen={false} />);
		const outer = getDesktopSidebar(container);
		expect(outer).toHaveAttribute("data-state", "collapsed");
		expect(outer).toHaveAttribute("data-collapsible", "offcanvas");
	});

	it("uses the lg breakpoint and renders no md: class", () => {
		const { container } = render(<Shell />);
		const outer = getDesktopSidebar(container);
		expect(outer).toHaveClass("hidden", "lg:block");
		expect(getSlot(container, "sidebar-container")).toHaveClass(
			"hidden",
			"lg:flex",
		);
		const wrapper = getSlot(container, "sidebar-wrapper");
		const all = [wrapper, ...wrapper.querySelectorAll("*")];
		const mdClasses = all.flatMap((el) =>
			Array.from(el.classList).filter((c) => c.startsWith("md:")),
		);
		expect(mdClasses).toEqual([]);
	});

	it("renders a single static panel with collapsible='none'", () => {
		const { container } = render(
			<SidebarProvider>
				<Sidebar collapsible="none">
					<span>Static</span>
				</Sidebar>
			</SidebarProvider>,
		);
		const panels = container.querySelectorAll('[data-slot="sidebar"]');
		expect(panels).toHaveLength(1);
		expect(panels[0]).toHaveClass("w-(--sidebar-width)");
		expect(container.querySelector('[data-slot="sidebar-container"]')).toBe(
			null,
		);
	});

	it("passes variant and side to the outer element", () => {
		const { container } = render(
			<SidebarProvider>
				<Sidebar variant="floating" side="right">
					<span>Floating</span>
				</Sidebar>
			</SidebarProvider>,
		);
		const outer = getDesktopSidebar(container);
		expect(outer).toHaveAttribute("data-variant", "floating");
		expect(outer).toHaveAttribute("data-side", "right");
		expect(getSlot(container, "sidebar-container")).toHaveClass("p-2");
	});
});

describe("SidebarTrigger", () => {
	it("toggles, reports aria-expanded, calls onClick and persists the cookie", () => {
		const onClick = vi.fn();
		render(
			<SidebarProvider>
				<SidebarTrigger onClick={onClick} />
				<StateProbe />
			</SidebarProvider>,
		);
		const trigger = screen.getByRole("button", {
			name: "Toggle navigation menu",
		});
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger).toHaveAttribute("data-slot", "sidebar-trigger");
		expect(trigger.querySelector("svg")).toHaveClass("size-5");

		fireEvent.click(trigger);
		expect(STATE()).toBe("collapsed");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(cookieSet).toHaveBeenCalledTimes(1);
		expect(cookieSet).toHaveBeenLastCalledWith(
			"sidebar_state=false; path=/; max-age=604800; SameSite=Lax",
		);

		fireEvent.click(trigger);
		expect(STATE()).toBe("expanded");
		expect(cookieSet).toHaveBeenLastCalledWith(
			"sidebar_state=true; path=/; max-age=604800; SameSite=Lax",
		);
		expect(screen.queryByText("Toggle Sidebar")).toBe(null);
	});
});

describe("SidebarRail", () => {
	it("is named, untabbable and toggles", () => {
		render(<Shell />);
		const rails = screen
			.getAllByRole("button", { name: "Toggle navigation menu" })
			.filter((b) => b.getAttribute("data-slot") === "sidebar-rail");
		expect(rails).toHaveLength(1);
		const railEl = rails[0];
		if (!railEl) throw new Error("no rail");
		expect(railEl).toHaveAttribute("title", "Toggle navigation menu");
		expect(railEl.tabIndex).toBe(-1);
		fireEvent.click(railEl);
		expect(STATE()).toBe("collapsed");
		fireEvent.click(railEl);
		expect(STATE()).toBe("expanded");
	});
});

describe("controlled mode", () => {
	it("calls onOpenChange and keeps the open prop", () => {
		const onOpenChange = vi.fn();
		render(
			<SidebarProvider open={true} onOpenChange={onOpenChange}>
				<SidebarTrigger />
				<StateProbe />
			</SidebarProvider>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Toggle navigation menu" }),
		);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(STATE()).toBe("expanded");
	});

	it("collapses when a consumer calls setOpen with a plain boolean", () => {
		render(<Shell />);
		fireEvent.click(screen.getByRole("button", { name: "Collapse directly" }));
		expect(STATE()).toBe("collapsed");
		expect(cookieSet).toHaveBeenLastCalledWith(
			"sidebar_state=false; path=/; max-age=604800; SameSite=Lax",
		);
	});
});

describe("keyboard shortcut (D-52)", () => {
	it.each([
		["Ctrl+b", { key: "b", ctrlKey: true }],
		["Meta+b", { key: "b", metaKey: true }],
		["Ctrl+B without Shift", { key: "B", ctrlKey: true }],
	])("%s toggles and prevents the default", (_label, init) => {
		render(<Shell />);
		expect(fireEvent.keyDown(window, init)).toBe(false);
		expect(STATE()).toBe("collapsed");
		expect(fireEvent.keyDown(window, init)).toBe(false);
		expect(STATE()).toBe("expanded");
	});

	it.each([
		["Ctrl+Shift+b", { key: "b", ctrlKey: true, shiftKey: true }],
		["Ctrl+Alt+b", { key: "b", ctrlKey: true, altKey: true }],
		["Ctrl+b repeat", { key: "b", ctrlKey: true, repeat: true }],
		["Ctrl+k", { key: "k", ctrlKey: true }],
		["plain b", { key: "b" }],
	])("%s is ignored", (_label, init) => {
		render(<Shell />);
		expect(fireEvent.keyDown(window, init)).toBe(true);
		expect(STATE()).toBe("expanded");
	});

	it.each([
		["input", <input key="t" data-testid="target" />],
		["textarea", <textarea key="t" data-testid="target" />],
		[
			"select",
			<select key="t" data-testid="target">
				<option>one</option>
			</select>,
		],
		[
			"contenteditable descendant",
			<div key="t" contentEditable suppressContentEditableWarning>
				<span data-testid="target">editable</span>
			</div>,
		],
	])("Ctrl+b on an %s is ignored", (_label, node) => {
		render(<Shell>{node}</Shell>);
		const target = screen.getByTestId("target");
		expect(fireEvent.keyDown(target, { key: "b", ctrlKey: true })).toBe(true);
		expect(STATE()).toBe("expanded");
	});

	it("still acts inside contenteditable='false'", () => {
		render(
			<Shell>
				<div contentEditable={false}>
					<span data-testid="target">read only</span>
				</div>
			</Shell>,
		);
		const target = screen.getByTestId("target");
		expect(fireEvent.keyDown(target, { key: "b", ctrlKey: true })).toBe(false);
		expect(STATE()).toBe("collapsed");
	});

	it.each([
		["dialog", "dialog"],
		["alertdialog", "alertdialog"],
	])("is ignored while an open %s is in the document", (_label, role) => {
		render(
			<Shell>
				<div role={role} data-state="open" aria-label="Other" />
			</Shell>,
		);
		expect(fireEvent.keyDown(window, { key: "b", ctrlKey: true })).toBe(true);
		expect(STATE()).toBe("expanded");
	});

	it("ignores a keydown with no key (Chrome autofill) without throwing", () => {
		const errors: unknown[] = [];
		const onError = (event: ErrorEvent) => {
			errors.push(event.error);
			event.preventDefault();
		};
		window.addEventListener("error", onError);
		try {
			render(<Shell />);
			// Chrome's autofill dispatches a plain Event named keydown: no `key`.
			const autofill = new Event("keydown", {
				bubbles: true,
				cancelable: true,
			});
			expect(window.dispatchEvent(autofill)).toBe(true);
			expect(errors).toEqual([]);
			expect(STATE()).toBe("expanded");
			// Positive control: the listener is attached and still handles a press.
			expect(fireEvent.keyDown(window, { key: "b", ctrlKey: true })).toBe(
				false,
			);
			expect(STATE()).toBe("collapsed");
		} finally {
			window.removeEventListener("error", onError);
		}
	});

	it("is not blocked by the open nav sheet (data-slot='sidebar')", () => {
		render(
			<Shell>
				<div
					role="dialog"
					data-state="open"
					data-slot="sidebar"
					aria-label="Nav"
				/>
			</Shell>,
		);
		expect(fireEvent.keyDown(window, { key: "b", ctrlKey: true })).toBe(false);
		expect(STATE()).toBe("collapsed");
	});
});

describe("collapsed inert regions (D-34)", () => {
	it("marks header, content and footer inert only when collapsed", () => {
		const { container } = render(<Shell />);
		const parts = ["sidebar-header", "sidebar-content", "sidebar-footer"];
		const rail = getSlot(container, "sidebar-rail");
		for (const slot of parts) {
			expect(getSlot(container, slot).hasAttribute("inert")).toBe(false);
		}
		expect(rail.closest("[inert]")).toBe(null);

		fireEvent.click(rail);
		expect(STATE()).toBe("collapsed");
		for (const slot of parts) {
			expect(getSlot(container, slot).hasAttribute("inert")).toBe(true);
		}
		expect(rail.closest("[inert]")).toBe(null);

		fireEvent.click(rail);
		expect(STATE()).toBe("expanded");
	});
});

describe("mobile sheet", () => {
	it("opens a named dialog that hides the sheet's own close button", async () => {
		stubMobile();
		render(<Shell defaultOpen={false} />);
		expect(screen.getByTestId("is-mobile")).toHaveTextContent("true");
		expect(screen.queryByRole("dialog")).toBe(null);

		const trigger = screen.getByRole("button", {
			name: "Toggle navigation menu",
		});
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(trigger);

		const dialog = await screen.findByRole("dialog", {
			name: "Navigation menu",
		});
		expect(dialog).toHaveAccessibleDescription(
			"Main navigation for your TenantFlow account",
		);
		expect(dialog).toHaveAttribute("data-slot", "sidebar");
		expect(dialog).toHaveAttribute("data-mobile", "true");
		expect(dialog).toHaveClass(
			"w-(--sidebar-width-mobile)",
			"ease-out",
			"data-[state=open]:duration-200",
			"data-[state=closed]:duration-200",
			"[&>button]:hidden",
		);
		expect(dialog.style.getPropertyValue("--sidebar-width")).toBe("");
		const close = screen.getByRole("button", { name: "Close" });
		expect(close.parentElement).toBe(dialog);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByTestId("open-mobile")).toHaveTextContent("true");
		expect(dialog.querySelector("[inert]")).toBe(null);
		expect(dialog.closest("[inert]")).toBe(null);

		fireEvent.keyDown(dialog, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it("opens and closes the sheet with Ctrl+b and writes no cookie", async () => {
		stubMobile();
		render(<Shell />);
		expect(fireEvent.keyDown(window, { key: "b", ctrlKey: true })).toBe(false);
		await screen.findByRole("dialog", { name: "Navigation menu" });
		expect(fireEvent.keyDown(window, { key: "b", ctrlKey: true })).toBe(false);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBe(null));
		expect(STATE()).toBe("expanded");
		expect(cookieSet).not.toHaveBeenCalled();
	});
});

const LIST_BASELINE = {
	paddingLeft: "24px",
	marginTop: "16px",
	marginBottom: "16px",
	firstChildMarginBottom: "4px",
};

describe("menu lists (D-49 base-rule neutralizers)", () => {
	it("zeroes SidebarMenu padding-left, both margins and the item margin", () => {
		const { container } = render(
			<SidebarProvider>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>Item</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarProvider>,
		);
		expect(getSlot(container, "sidebar-group").tagName).toBe("DIV");
		const menu = getSlot(container, "sidebar-menu");
		expect(menu.tagName).toBe("UL");
		const item = getSlot(container, "sidebar-menu-item");
		expect(item.tagName).toBe("LI");
		expect(item).toHaveClass("group/menu-item");

		const { neutralized, baseline } = computeListCascade(menu);
		expect(baseline).toMatchObject(LIST_BASELINE);
		expect(neutralized).toEqual({
			paddingLeft: "0px",
			marginTop: "0px",
			marginBottom: "0px",
			firstChildTag: "li",
			firstChildMarginBottom: "0px",
		});
	});

	it("zeroes SidebarMenuSub margins and the sub item margin", () => {
		const { container } = render(
			<SidebarProvider>
				<SidebarMenuSub>
					<SidebarMenuSubItem>Sub item</SidebarMenuSubItem>
				</SidebarMenuSub>
			</SidebarProvider>,
		);
		const sub = getSlot(container, "sidebar-menu-sub");
		expect(sub.tagName).toBe("UL");
		expect(getSlot(container, "sidebar-menu-sub-item").tagName).toBe("LI");

		const { neutralized, baseline } = computeListCascade(sub);
		expect(baseline).toMatchObject(LIST_BASELINE);
		expect(neutralized).toMatchObject({
			marginTop: "0px",
			marginBottom: "0px",
			firstChildTag: "li",
			firstChildMarginBottom: "0px",
		});
	});
});

describe("SidebarMenuButton", () => {
	function renderInMenu(node: ReactNode) {
		return render(
			<SidebarProvider>
				<SidebarMenu>
					<SidebarMenuItem>{node}</SidebarMenuItem>
				</SidebarMenu>
			</SidebarProvider>,
		);
	}

	it("renders a default button", () => {
		renderInMenu(<SidebarMenuButton>Plain</SidebarMenuButton>);
		const button = screen.getByRole("button", { name: "Plain" });
		expect(button).toHaveAttribute("data-slot", "sidebar-menu-button");
		expect(button).toHaveAttribute("data-size", "default");
		expect(button).toHaveAttribute("data-active", "false");
		expect(button).toHaveClass("no-underline");
	});

	it("reports isActive", () => {
		renderInMenu(<SidebarMenuButton isActive>Active</SidebarMenuButton>);
		expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute(
			"data-active",
			"true",
		);
	});

	it("renders the child anchor with asChild", () => {
		renderInMenu(
			<SidebarMenuButton asChild>
				<a href="/dashboard">Dashboard</a>
			</SidebarMenuButton>,
		);
		const link = screen.getByRole("link", { name: "Dashboard" });
		expect(link).toHaveAttribute("data-slot", "sidebar-menu-button");
		expect(link).toHaveAttribute("data-size", "default");
		expect(link).toHaveAttribute("data-active", "false");
		expect(link).toHaveClass("no-underline");
	});

	it("applies the outline variant and lg size", () => {
		renderInMenu(
			<SidebarMenuButton variant="outline" size="lg">
				Large
			</SidebarMenuButton>,
		);
		expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute(
			"data-size",
			"lg",
		);
	});

	it.each([
		["string", "Dashboard"],
		["object", { children: "Dashboard" }],
	] as const)(
		"wraps the button in a tooltip trigger (%s tooltip)",
		(_label, tooltip) => {
			renderInMenu(
				<SidebarMenuButton tooltip={tooltip}>Tip</SidebarMenuButton>,
			);
			const button = screen.getByRole("button", { name: "Tip" });
			expect(button).toHaveAttribute("data-slot", "sidebar-menu-button");
			expect(button).toHaveAttribute("data-state", "closed");
		},
	);
});

describe("SidebarMenuSubButton", () => {
	function renderInSub(node: ReactNode) {
		return render(
			<SidebarProvider>
				<SidebarMenuSub>
					<SidebarMenuSubItem>{node}</SidebarMenuSubItem>
				</SidebarMenuSub>
			</SidebarProvider>,
		);
	}

	it("renders a medium anchor by default", () => {
		renderInSub(
			<SidebarMenuSubButton href="/leases">Leases</SidebarMenuSubButton>,
		);
		const link = screen.getByRole("link", { name: "Leases" });
		expect(link).toHaveAttribute("data-slot", "sidebar-menu-sub-button");
		expect(link).toHaveAttribute("data-size", "md");
		expect(link).toHaveAttribute("data-active", "false");
		expect(link).toHaveClass("no-underline", "text-sm");
	});

	it("renders the small size and isActive", () => {
		renderInSub(
			<SidebarMenuSubButton href="/leases" size="sm" isActive>
				Small
			</SidebarMenuSubButton>,
		);
		const link = screen.getByRole("link", { name: "Small" });
		expect(link).toHaveClass("text-xs");
		expect(link).not.toHaveClass("text-sm");
		expect(link).toHaveAttribute("data-active", "true");
	});

	it("keeps the child anchor with asChild", () => {
		renderInSub(
			<SidebarMenuSubButton asChild>
				<a href="/tenants">Tenants</a>
			</SidebarMenuSubButton>,
		);
		const link = screen.getByRole("link", { name: "Tenants" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("data-slot", "sidebar-menu-sub-button");
	});
});

describe("SidebarSeparator (S11)", () => {
	it("merges away the Separator's horizontal w-full", () => {
		const { container } = render(
			<SidebarProvider>
				<SidebarSeparator />
			</SidebarProvider>,
		);
		const separator = getSlot(container, "sidebar-separator");
		expect(separator).toHaveClass(
			"data-[orientation=horizontal]:w-auto",
			"mx-2",
			"bg-sidebar-border",
		);
		expect(separator).not.toHaveClass("data-[orientation=horizontal]:w-full");
	});
});
