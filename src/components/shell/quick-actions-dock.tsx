import { Bell, FileText, type LucideIcon, Plus, Wrench } from "lucide-react";
import Link from "next/link";

export interface QuickAction {
	id: string;
	label: string;
	icon: LucideIcon;
	href: string;
}

export interface QuickActionsDockProps {
	actions?: QuickAction[];
	className?: string;
}

const defaultActions: QuickAction[] = [
	{
		id: "add-property",
		label: "Add Property",
		icon: Plus,
		href: "/properties/new",
	},
	{ id: "new-lease", label: "New Lease", icon: FileText, href: "/leases/new" },
	{
		id: "maintenance",
		label: "Maintenance",
		icon: Wrench,
		href: "/maintenance/new",
	},
	{
		id: "notifications",
		label: "Notifications",
		icon: Bell,
		href: "/notifications",
	},
];

export function QuickActionsDock({
	actions = defaultActions,
	className = "",
}: QuickActionsDockProps) {
	return (
		// Centers on the main column: offset by half the --sidebar-width rail
		// while it is docked and expanded, at the viewport center when the
		// offcanvas rail is collapsed, and moving with the rail's 200ms linear
		// transition (D-39, D-51). Its offset and panel height are the
		// --dock-offset and --dock-height tokens in globals.css, which also
		// derive the --dock-clearance the page reserves for it (CP-4 follow-up).
		<div
			data-testid="quick-actions-dock"
			data-slot="quick-actions-dock"
			className={`fixed bottom-(--dock-offset) left-1/2 -translate-x-1/2 z-50 hidden lg:block lg:left-[calc(50%+var(--sidebar-width)/2)] group-has-data-[collapsible=offcanvas]/sidebar-wrapper:lg:left-1/2 lg:transition-[left] lg:duration-200 lg:ease-linear ${className}`}
		>
			<div className="flex h-(--dock-height) items-center gap-2 px-4 bg-card/80 backdrop-blur-md border border-border rounded-2xl shadow-lg">
				{actions.map((action) => {
					const Icon = action.icon;
					return (
						<Link
							key={action.id}
							href={action.href}
							className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 hover:scale-110 transition-all duration-200 ease-out"
							aria-label={action.label}
							title={action.label}
						>
							<Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
							{/* Tooltip */}
							<span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium bg-foreground text-background rounded opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
								{action.label}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
