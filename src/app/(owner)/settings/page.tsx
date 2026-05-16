"use client";

import {
	Bell,
	Building2,
	ChevronRight,
	CreditCard,
	Database,
	FolderTree,
	Shield,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AccountDataSection } from "#components/settings/account-data-section";
import { BillingSettings } from "#components/settings/billing-settings";
import { CategoriesSettings } from "#components/settings/categories-settings";
import { GeneralSettings } from "#components/settings/general-settings";
import { NotificationSettings } from "#components/settings/notification-settings";
import { SecuritySettings } from "#components/settings/security-settings";
import { BlurFade } from "#components/ui/blur-fade";

type SettingsTab =
	| "general"
	| "notifications"
	| "security"
	| "billing"
	| "categories"
	| "data";

const TAB_VALUES: readonly SettingsTab[] = [
	"general",
	"notifications",
	"security",
	"billing",
	"categories",
	"data",
] as const;

// URL-param aliases for tab values. Keeps deep-links working when external
// links or docs use a kebab-case form that doesn't match the internal id
// (Session 11 P2 #6: `?tab=my-data` fell through to General silently).
const TAB_ALIASES: Record<string, SettingsTab> = {
	"my-data": "data",
};

function isSettingsTab(value: string): value is SettingsTab {
	return (TAB_VALUES as readonly string[]).includes(value);
}

function resolveTabParam(value: string | null): SettingsTab | null {
	if (!value) return null;
	if (isSettingsTab(value)) return value;
	const aliased = TAB_ALIASES[value];
	return aliased ?? null;
}

interface SettingsSection {
	id: SettingsTab;
	label: string;
	icon: ReactNode;
	description: string;
}

const sections: SettingsSection[] = [
	{
		id: "general",
		label: "General",
		icon: <Building2 className="h-4 w-4" />,
		description: "Business profile and preferences",
	},
	{
		id: "notifications",
		label: "Notifications",
		icon: <Bell className="h-4 w-4" />,
		description: "Email, SMS, and push settings",
	},
	{
		id: "security",
		label: "Security",
		icon: <Shield className="h-4 w-4" />,
		description: "Password and authentication",
	},
	{
		id: "billing",
		label: "Billing",
		icon: <CreditCard className="h-4 w-4" />,
		description: "Subscription and payment info",
	},
	{
		id: "categories",
		label: "Categories",
		icon: <FolderTree className="h-4 w-4" />,
		description: "Customize the document taxonomy",
	},
	{
		id: "data",
		label: "My Data",
		icon: <Database className="h-4 w-4" />,
		description: "Export or delete your data",
	},
];

export default function SettingsPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const tabParam = resolveTabParam(searchParams.get("tab"));
	const [activeTab, setActiveTab] = useState<SettingsTab>(
		tabParam ?? "general",
	);
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

	// Update tab when URL changes
	useEffect(() => {
		if (tabParam) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	// Update URL when tab changes
	const handleTabChange = (tab: SettingsTab) => {
		setActiveTab(tab);
		router.push(`/settings?tab=${tab}`, { scroll: false });
	};

	// WAI-ARIA Tabs keyboard pattern: ArrowUp/ArrowDown rotate focus
	// through the vertical tablist; Home/End jump to the first/last
	// tab. Roving tabindex below keeps a single Tab stop on the
	// tablist (only the active tab has tabIndex=0). Cycle-1 review
	// caught that declaring role=tablist without arrow-key handling
	// was a half-implementation that confuses screen readers.
	const handleTabKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		index: number,
	) => {
		let nextIndex: number | null = null;
		switch (event.key) {
			case "ArrowDown":
				nextIndex = (index + 1) % sections.length;
				break;
			case "ArrowUp":
				nextIndex = (index - 1 + sections.length) % sections.length;
				break;
			case "Home":
				nextIndex = 0;
				break;
			case "End":
				nextIndex = sections.length - 1;
				break;
		}
		if (nextIndex === null) return;
		event.preventDefault();
		const nextSection = sections[nextIndex];
		if (!nextSection) return;
		handleTabChange(nextSection.id);
		tabRefs.current[nextIndex]?.focus();
	};

	const renderContent = () => {
		switch (activeTab) {
			case "general":
				return <GeneralSettings />;
			case "notifications":
				return <NotificationSettings />;
			case "security":
				return <SecuritySettings />;
			case "billing":
				return <BillingSettings />;
			case "categories":
				return <CategoriesSettings />;
			case "data":
				return <AccountDataSection />;
			default:
				return <GeneralSettings />;
		}
	};

	return (
		<div className="p-4 sm:p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h1 className="text-2xl font-bold">Settings</h1>
					<p className="text-sm text-muted-foreground">
						Manage your account and application preferences
					</p>
				</div>
			</BlurFade>

			{/* Settings Layout */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* Sidebar Navigation — semantic tablist for SR users
				    (Session 11 P2 #7). Each button declares role="tab",
				    aria-selected, and data-state so screen readers and
				    drive-by lint tools both see the tab state. */}
				{/* Single outer BlurFade for the tablist. Cycle-1 review
				    caught that per-tab BlurFade wrappers nested between the
				    tablist and its tabs broke the WAI-ARIA owns-relationship
				    tree. Tabs are now direct DOM children of the tablist. */}
				<BlurFade delay={0.15} inView>
					<nav
						className="lg:w-56 shrink-0 space-y-1"
						role="tablist"
						aria-orientation="vertical"
						aria-label="Settings sections"
					>
						{sections.map((section, index) => {
							const isActive = activeTab === section.id;
							return (
								<button
									key={section.id}
									type="button"
									role="tab"
									ref={(el) => {
										tabRefs.current[index] = el;
									}}
									aria-selected={isActive}
									aria-controls={`settings-panel-${section.id}`}
									id={`settings-tab-${section.id}`}
									data-state={isActive ? "active" : "inactive"}
									tabIndex={isActive ? 0 : -1}
									onClick={() => handleTabChange(section.id)}
									onKeyDown={(e) => handleTabKeyDown(e, index)}
									className={`flex w-full min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
										isActive
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
								>
									<div className="flex items-center gap-3">
										{section.icon}
										<span>{section.label}</span>
									</div>
									<ChevronRight
										className={`h-4 w-4 transition-transform ${isActive ? "rotate-90" : ""}`}
									/>
								</button>
							);
						})}
					</nav>
				</BlurFade>

				{/* Main Content — tabpanel wrapper provides the
				    aria-labelledby anchor for the active tab. */}
				<div
					className="flex-1 min-w-0"
					role="tabpanel"
					id={`settings-panel-${activeTab}`}
					aria-labelledby={`settings-tab-${activeTab}`}
				>
					{renderContent()}
				</div>
			</div>
		</div>
	);
}
