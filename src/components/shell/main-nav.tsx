"use client";

import {
	BarChart3,
	Building2,
	ChevronDown,
	ClipboardList,
	FileText,
	FolderArchive,
	HelpCircle,
	Home,
	Inbox,
	type LucideIcon,
	Settings,
	Users,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#components/ui/collapsible";
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarSeparator,
	useCollapsedInert,
} from "#components/ui/sidebar";
import {
	isNavPathActive,
	type NavSectionState,
} from "#hooks/use-nav-section-state";

export interface NavigationItem {
	label: string;
	href: string;
	icon: LucideIcon;
	children?: { label: string; href: string }[];
}

interface MainNavProps {
	onNavigate?: () => void;
	sections: NavSectionState;
}

// Core navigation items
const coreItems: NavigationItem[] = [
	{ label: "Dashboard", href: "/dashboard", icon: Home },
	{ label: "Properties", href: "/properties", icon: Building2 },
	{ label: "Tenants", href: "/tenants", icon: Users },
	{ label: "Leases", href: "/leases", icon: ClipboardList },
	// Phase 66 (APPLY-03, UI-11): FLAT for the same reason Documents is — see the
	// note below. No unread badge this phase: a per-status count needs its own
	// query nothing else on this page issues. `Inbox` is unused elsewhere in src/;
	// ClipboardList is Leases, ClipboardCheck is the property-inspection tile, and
	// UserSearch was rejected because it reads as screening, which this product
	// does not do (APPLY-06 disclaims it).
	{ label: "Applications", href: "/applications", icon: Inbox },
	{ label: "Maintenance", href: "/maintenance", icon: Wrench },
	// Phase 65 (DOCS-01): deliberately FLAT — no `children`. A parent with
	// children renders as a CollapsibleTrigger toggle button with NO <Link> at
	// all, so giving Documents children would make /documents unreachable from
	// the sidebar and defeat the entry-point requirement this phase exists for.
	{ label: "Documents", href: "/documents", icon: FolderArchive },
];

// Collapsible sections
const analyticsItems: NavigationItem[] = [
	{
		label: "Analytics",
		href: "/analytics",
		icon: BarChart3,
		children: [
			{ label: "Overview", href: "/analytics/overview" },
			{ label: "Financial", href: "/analytics/financial" },
			{
				label: "Property Performance",
				href: "/analytics/property-performance",
			},
			// Domain-specific analytics (Leases, Maintenance, Occupancy) are now
			// available via "Insights" tabs on their respective main pages
		],
	},
	{
		// D-29 FULL SEPARATION: Reports and Analytics are two peer sections, each
		// owning its own URL tree. Reports = statements + exports ("what do I owe /
		// what did I collect"); Analytics = charts ("how is the portfolio
		// trending"). The children mirror REPORTS_HUB_ENTRIES order exactly.
		label: "Reports",
		href: "/reports",
		icon: FileText,
		children: [
			{ label: "Income Statement", href: "/reports/income-statement" },
			{ label: "Cash Flow", href: "/reports/cash-flow" },
			{ label: "Balance Sheet", href: "/reports/balance-sheet" },
			{ label: "Expenses", href: "/reports/expenses" },
			{ label: "Tax Documents", href: "/reports/tax-documents" },
			{ label: "Generate Reports", href: "/reports/generate" },
			{ label: "Year-End", href: "/reports/year-end" },
		],
	},
];

// Footer links (66.2 D-38): Settings and Help & Support, as plain rows.
const footerItems: NavigationItem[] = [
	{ label: "Settings", href: "/settings", icon: Settings },
	{ label: "Help & Support", href: "/help", icon: HelpCircle },
];

export function MainNav({ onNavigate, sections }: MainNavProps) {
	const pathname = usePathname();
	// The collapsed desktop rail hides this landmark too, not only the regions
	// inside it, so no empty navigation landmark stays exposed (UI-SPEC S-5).
	const collapsedInert = useCollapsedInert();

	const handleNavigate = () => {
		onNavigate?.();
	};

	const renderLink = (item: NavigationItem, active: boolean) => {
		const Icon = item.icon;
		return (
			<SidebarMenuItem key={item.href}>
				<SidebarMenuButton
					asChild
					isActive={active}
					className="h-10 gap-3 rounded-lg px-3 font-medium transition-colors no-underline max-md:min-h-11 [&>svg]:size-5 data-[active=true]:bg-primary/10 data-[active=true]:text-primary-text"
				>
					<Link
						href={item.href}
						onClick={handleNavigate}
						aria-current={active ? "page" : undefined}
					>
						<Icon
							className={active ? "text-primary-text" : "text-muted-foreground"}
						/>
						<span>{item.label}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	};

	const renderSection = (item: NavigationItem) => {
		const Icon = item.icon;
		return (
			<Collapsible
				key={item.href}
				asChild
				open={sections.isSectionOpen(item.href)}
				onOpenChange={(open) => sections.setSectionOpen(item.href, open)}
				className="group/collapsible"
			>
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton className="h-10 gap-3 rounded-lg px-3 font-medium transition-colors no-underline max-md:min-h-11 [&>svg]:size-5 [&>svg:last-child]:size-4">
							<Icon className="text-muted-foreground" />
							<span>{item.label}</span>
							<ChevronDown className="ml-auto text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					{/* The sub rows end flush with this overflow-hidden box, so their
					    focus ring is inset (UI-SPEC S-3): an outset ring would lose its
					    inline-end 2px to the clip. */}
					<CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
						<SidebarMenuSub className="mx-0 ml-8 translate-x-0 gap-0.5 border-l-0 pl-0 pr-0 py-1">
							{item.children?.map((child) => {
								const childActive = pathname === child.href;
								return (
									<SidebarMenuSubItem key={child.href}>
										<SidebarMenuSubButton
											asChild
											isActive={childActive}
											className="h-9 translate-x-0 gap-3 rounded-lg px-3 text-muted-foreground transition-colors no-underline focus-visible:ring-inset max-md:min-h-11 data-[active=true]:bg-primary/5 data-[active=true]:font-medium data-[active=true]:text-primary-text"
										>
											<Link
												href={child.href}
												onClick={handleNavigate}
												aria-current={childActive ? "page" : undefined}
											>
												<span>{child.label}</span>
											</Link>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								);
							})}
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		);
	};

	return (
		<nav className="flex min-h-0 flex-1 flex-col" inert={collapsedInert}>
			<SidebarContent className="gap-0 px-3 py-2">
				<SidebarGroup className="p-0">
					<SidebarMenu className="gap-0.5">
						{coreItems.map((item) =>
							renderLink(item, isNavPathActive(item.href, pathname)),
						)}
					</SidebarMenu>
				</SidebarGroup>
				<SidebarSeparator className="mx-0 mt-6 mb-4" />
				<SidebarGroup className="p-0">
					<SidebarMenu className="gap-0.5">
						{analyticsItems.map(renderSection)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarSeparator className="mx-3 my-0" />
			<SidebarFooter className="gap-0 px-3 pt-4 pb-2">
				<SidebarMenu className="gap-0.5">
					{footerItems.map((item) =>
						// Help & Support is never active: /help is outside the shell
						// (UI-SPEC S-7).
						renderLink(
							item,
							item.href !== "/help" && isNavPathActive(item.href, pathname),
						),
					)}
				</SidebarMenu>
			</SidebarFooter>
		</nav>
	);
}
