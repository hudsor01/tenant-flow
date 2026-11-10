"use client";

import { Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { type RefObject, useEffect, useRef } from "react";
import {
	Sidebar,
	SidebarHeader,
	SidebarRail,
	useSidebar,
} from "#components/ui/sidebar";
import type { NavSectionState } from "#hooks/use-nav-section-state";
import { MainNav } from "./main-nav";

interface AppShellSidebarProps {
	triggerRef: RefObject<HTMLButtonElement | null>;
	onCommandOpen: () => void;
	sections: NavSectionState;
}

export function AppShellSidebar({
	triggerRef,
	onCommandOpen,
	sections,
}: AppShellSidebarProps) {
	const { setOpenMobile } = useSidebar();
	const closeMobile = () => setOpenMobile(false);

	return (
		<Sidebar
			collapsible="offcanvas"
			role="complementary"
			data-tour="sidebar-nav"
			className="z-50 h-auto"
		>
			<SidebarHeader className="gap-0 p-0">
				{/* Logo */}
				<div className="flex items-center gap-3 px-4 h-14 shrink-0">
					<Link
						href="/dashboard"
						onClick={closeMobile}
						className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none hover:opacity-80 transition-opacity no-underline"
					>
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
							<Sparkles className="w-4 h-4 text-sidebar-primary-foreground" />
						</div>
						<span className="font-semibold text-foreground text-lg tracking-tight">
							TenantFlow
						</span>
					</Link>
					{/* The one visible close control of the mobile sheet (D-46,
					    UI-SPEC S-4). The corner button of the sheet itself stays
					    hidden by the vendored `[&>button]:hidden`. */}
					<button
						type="button"
						aria-label="Close navigation menu"
						onClick={closeMobile}
						className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted lg:hidden"
					>
						<X className="size-4 text-muted-foreground" />
					</button>
				</div>

				{/* Command Palette Trigger — Session 11 P3 #41: the bare
				    "Search..." pill read as a search input but actually opens
				    the cmdk command palette, so it was renamed and told screen
				    readers it routes to the same surface ⌘K opens.
				    NO aria-label here, on purpose (WCAG 2.5.3 Label in Name,
				    axe `label-content-name-mismatch`, default-on since axe-core
				    4.14): an aria-label REPLACES the accessible name, and the
				    old one did not contain the visible text, so a voice-control
				    user saying "Search pages and actions" could not activate
				    this. The visible text now IS the start of the name and the
				    command-palette hint is an sr-only suffix. */}
				<div className="px-3 py-3">
					<button
						onClick={onCommandOpen}
						className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm rounded-md border border-border transition-colors"
					>
						<Search className="w-4 h-4" />
						<span className="flex-1 text-left">Search pages and actions…</span>
						<kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background border border-border rounded">
							<span className="text-xs">&#8984;</span>K
						</kbd>
						<span className="sr-only"> (opens the command palette)</span>
					</button>
				</div>
			</SidebarHeader>

			{/* Navigation */}
			<MainNav sections={sections} onNavigate={closeMobile} />
			<SidebarRail />
			<SidebarSheetFocusReturn triggerRef={triggerRef} />
		</Sidebar>
	);
}

/**
 * Returns focus to the header trigger after the mobile sheet closes (D-47,
 * the phase-07 locked decision). Radix refocuses only a `Dialog.Trigger`, and
 * the header trigger is not one, so this child of `<Sidebar>` does it when the
 * sheet content unmounts. The `openMobile` ref skips the StrictMode simulated
 * unmount, which happens while the sheet is still open; the `isMobile` ref
 * skips the desktop branch unmounting on a resize into the sheet mode.
 */
function SidebarSheetFocusReturn({
	triggerRef,
}: {
	triggerRef: RefObject<HTMLButtonElement | null>;
}) {
	const { openMobile, isMobile } = useSidebar();
	const openRef = useRef(openMobile);
	const mobileRef = useRef(isMobile);

	useEffect(() => {
		openRef.current = openMobile;
		mobileRef.current = isMobile;
	}, [openMobile, isMobile]);

	useEffect(
		() => () => {
			if (mobileRef.current && !openRef.current) {
				setTimeout(() => triggerRef.current?.focus(), 0);
			}
		},
		[triggerRef],
	);

	return null;
}
