"use client";

import {
	BarChart3,
	Bell,
	Building2,
	ClipboardList,
	FileCheck,
	FileText,
	FolderArchive,
	HelpCircle,
	Home,
	Inbox,
	Settings,
	Users,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { SidebarProvider, useSidebar } from "#components/ui/sidebar";
import { useSupabaseUser } from "#hooks/api/use-auth";
import { useSignOutMutation } from "#hooks/api/use-auth-mutations";
import { usePropertyList } from "#hooks/api/use-properties";
import { useTenantList } from "#hooks/api/use-tenant";
import { useNavSectionState } from "#hooks/use-nav-section-state";
import { generateBreadcrumbs } from "#lib/breadcrumbs";
import { cn } from "#lib/utils";
import { AppShellHeader } from "./app-shell-header";
import { AppShellSearch } from "./app-shell-search";
import { AppShellSidebar } from "./app-shell-sidebar";
import { QuickActionsDock } from "./quick-actions-dock";

export interface AppShellProps {
	children: ReactNode;
	showQuickActionsDock?: boolean;
	defaultSidebarOpen?: boolean;
}

export function AppShell({
	children,
	showQuickActionsDock = true,
	defaultSidebarOpen = true,
}: AppShellProps) {
	return (
		<SidebarProvider
			defaultOpen={defaultSidebarOpen}
			className="min-h-screen bg-background"
		>
			<AppShellFrame showQuickActionsDock={showQuickActionsDock}>
				{children}
			</AppShellFrame>
		</SidebarProvider>
	);
}

function AppShellFrame({
	children,
	showQuickActionsDock,
}: {
	children: ReactNode;
	showQuickActionsDock: boolean;
}) {
	const [commandOpen, setCommandOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const { setOpenMobile } = useSidebar();
	const pathname = usePathname();
	// Section open state lives here, outside the sheet, so it survives the
	// mobile sheet unmounting its content (D-50, RESEARCH P10).
	const navSections = useNavSectionState(pathname);
	const breadcrumbs = generateBreadcrumbs(pathname);
	// The floating dock is hidden on form/create routes (it would overlap the
	// primary submit). The same condition gates the bottom-padding clearance
	// below so form pages get no reserved dead space with no dock.
	const dockVisible =
		showQuickActionsDock && !/\/(new|edit)(?:\/|$)/.test(pathname);
	const { data: user } = useSupabaseUser();
	const signOutMutation = useSignOutMutation();
	const router = useRouter();
	const { data: properties } = usePropertyList({ limit: 6 });
	const { data: tenantsResponse } = useTenantList(1, 6);

	// Get user initials
	const userName = user?.user_metadata?.full_name || user?.email || "User";
	const userEmail = user?.email || "";
	const userInitials = userName
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const tenantItems = (() => {
		const tenants = tenantsResponse?.data ?? [];
		return tenants.map((tenant) => {
			const fullName =
				tenant.name ||
				(tenant.first_name && tenant.last_name
					? `${tenant.first_name} ${tenant.last_name}`.trim()
					: tenant.first_name || tenant.last_name || "Unknown");
			return {
				id: tenant.id,
				label: fullName,
				subtitle: tenant.email ?? "",
				href: `/tenants/${tenant.id}`,
			};
		});
	})();

	const propertyItems = (properties ?? []).map((property) => ({
		id: property.id,
		label: property.name,
		subtitle: [property.city, property.state].filter(Boolean).join(", "),
		href: `/properties/${property.id}`,
	}));

	const commandGroups = [
		{
			heading: "Navigation",
			items: [
				{ label: "Dashboard", href: "/dashboard", icon: Home },
				{ label: "Properties", href: "/properties", icon: Building2 },
				{ label: "Tenants", href: "/tenants", icon: Users },
				{ label: "Leases", href: "/leases", icon: ClipboardList },
				// Twin of `coreItems` in main-nav.tsx — these two arrays are
				// duplicated by design and must stay in sync, same entry, same
				// position. Adding a nav destination to only one of them ships a
				// route that is reachable from the sidebar but not from Cmd+K.
				{ label: "Applications", href: "/applications", icon: Inbox },
				{ label: "Maintenance", href: "/maintenance", icon: Wrench },
				{ label: "Documents", href: "/documents", icon: FolderArchive },
			],
		},
		{
			heading: "Analytics & Reports",
			items: [
				{
					label: "Analytics Overview",
					href: "/analytics/overview",
					icon: BarChart3,
				},
				{
					label: "Financial Analytics",
					href: "/analytics/financial",
					icon: BarChart3,
				},
				{
					label: "Property Performance",
					href: "/analytics/property-performance",
					icon: BarChart3,
				},
				{
					label: "Leases Analytics",
					href: "/analytics/leases",
					icon: BarChart3,
				},
				{
					label: "Maintenance Analytics",
					href: "/analytics/maintenance",
					icon: BarChart3,
				},
				{
					label: "Occupancy Analytics",
					href: "/analytics/occupancy",
					icon: BarChart3,
				},
				{ label: "Reports", href: "/reports", icon: FileText },
				// D-29 FULL SEPARATION: the statement routes are hub sub-routes now,
				// so they belong in this group rather than a separate one. There is
				// no bare hub-index row here because "Reports" above already is it.
				{
					label: "Income Statement",
					href: "/reports/income-statement",
					icon: FileText,
				},
				{ label: "Cash Flow", href: "/reports/cash-flow", icon: FileText },
				{
					label: "Balance Sheet",
					href: "/reports/balance-sheet",
					icon: FileText,
				},
				{ label: "Expenses", href: "/reports/expenses", icon: FileText },
				{
					label: "Tax Documents",
					href: "/reports/tax-documents",
					icon: FileText,
				},
				{ label: "Generate Report", href: "/reports/generate", icon: FileText },
				{ label: "Year-End", href: "/reports/year-end", icon: FileText },
			],
		},
		{
			heading: "Templates",
			items: [
				// Session 11 P3 #36: "Generate Lease" lived here AND in the
				// sidebar Templates section AND on /leases as the New Lease CTA.
				// Cycle 1 review caught that removing the sidebar entry alone
				// left the same workflow discoverable via Cmd+K. Now there's
				// one canonical entry point (the Leases tab's New Lease button).
				//
				// Phase 65 (D-09/L-04) KEEP: D-09 deletes the SIDEBAR Templates
				// section only. Under that flat-nav change the sidebar no longer
				// surfaces the lease builder at all, so deleting this row too would
				// leave /documents/lease-template reachable only from the /documents
				// landing — a discoverability regression shipped alongside a
				// discoverability feature. The palette is a search surface, where
				// duplication is a feature rather than a nav hierarchy.
				{
					label: "Lease Template",
					href: "/documents/lease-template",
					icon: FileCheck,
				},
			],
		},
	];

	const commandActions = [
		{ label: "Notifications", href: "/notifications", icon: Bell },
		{ label: "Settings", href: "/settings", icon: Settings },
		{ label: "Profile", href: "/profile", icon: Settings },
		{ label: "Help & Support", href: "/help", icon: HelpCircle },
	];

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Chrome dispatches a keydown with no `key` when it autofills a field.
			if (typeof event.key !== "string") {
				return;
			}
			if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
				// Battle-test Session 11 P2 #17: Cmd+K used to open the
				// command palette ON TOP of any open Radix Dialog (e.g. the
				// onboarding wizard). Two stacked role="dialog" elements is
				// confusing and breaks focus management. Suppress the shortcut
				// when another modal already owns the page — but always allow
				// the user to TOGGLE the command palette itself when it's
				// already the one open.
				setCommandOpen((prev) => {
					if (prev) {
						// already open → toggle closed regardless of other dialogs
						event.preventDefault();
						return false;
					}
					// not open → suppress open if another modal is in front.
					// preventDefault() so Firefox doesn't fall through to its
					// built-in quick-find toolbar (cycle-4 review P3 nit).
					// The nav sheet is excluded so the palette can open over it (D-48).
					if (
						document.querySelector(
							'[role="dialog"][data-state="open"]:not([data-slot="sidebar"])',
						)
					) {
						event.preventDefault();
						return prev;
					}
					event.preventDefault();
					return true;
				});
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const handleCommandSelect = (href: string) => {
		setCommandOpen(false);
		setOpenMobile(false);
		router.push(href);
	};

	return (
		<>
			{/*
				Skip-to-content link is provided by the root layout
				(src/app/layout.tsx). The previous duplicate here meant
				keyboard users tabbed through two visually-different
				skip links targeting the same anchor on dashboard pages.
				The `<main id="main-content">` below is the shared
				target for both marketing and dashboard layouts.
			 */}

			<AppShellSidebar
				triggerRef={triggerRef}
				onCommandOpen={() => setCommandOpen(true)}
				sections={navSections}
			/>

			{/* Main content area */}
			<div className="relative flex w-full min-w-0 flex-1 flex-col">
				<AppShellHeader
					triggerRef={triggerRef}
					breadcrumbs={breadcrumbs}
					user={user ?? null}
					userInitials={userInitials}
					userName={userName}
					userEmail={userEmail}
					onSignOut={() => signOutMutation.mutate()}
				/>

				{/* Page content. When the dock is visible (hidden lg:block, fixed),
				    lg:pb-(--dock-clearance) reserves the band it covers, the dock's
				    height plus its offset (globals.css), so the last rows and the
				    footer scroll clear of it. */}
				<main
					id="main-content"
					className={cn(
						"flex-1 bg-muted/30 pb-24 sm:pb-6",
						dockVisible && "lg:pb-(--dock-clearance)",
					)}
				>
					<div className="p-4 lg:p-6">{children}</div>
					{/* Minimal app-shell footer (Session 11 P2 #16): the
					    marketing footer is too marketing-heavy for the
					    authenticated surface; this thin row keeps Help /
					    Support / Terms reachable without dominating the
					    layout. */}
					<footer className="border-t border-border/60 bg-background/40 px-4 lg:px-6 py-4">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
							<p className="mb-0">
								&copy; {new Date().getFullYear()} TenantFlow
							</p>
							<nav className="flex items-center gap-4" aria-label="App footer">
								<Link
									href="/help"
									className="hover:text-foreground transition-colors"
								>
									Help
								</Link>
								<Link
									href="/terms"
									className="hover:text-foreground transition-colors"
								>
									Terms
								</Link>
								<Link
									href="/privacy"
									className="hover:text-foreground transition-colors"
								>
									Privacy
								</Link>
							</nav>
						</div>
					</footer>
				</main>
			</div>

			{/* Quick Actions Dock — hidden on form/create pages where it would
			    overlap the primary submit button (Session 11 P2 #14). */}
			{dockVisible && <QuickActionsDock />}

			<AppShellSearch
				open={commandOpen}
				onOpenChange={setCommandOpen}
				propertyItems={propertyItems}
				tenantItems={tenantItems}
				commandGroups={commandGroups}
				commandActions={commandActions}
				user={user}
				onSelect={handleCommandSelect}
				onSignOut={() => signOutMutation.mutate()}
			/>
		</>
	);
}
