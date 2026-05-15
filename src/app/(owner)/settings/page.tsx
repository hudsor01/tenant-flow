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
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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

function isSettingsTab(value: string): value is SettingsTab {
	return (TAB_VALUES as readonly string[]).includes(value);
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
	const tabParam = searchParams.get("tab") as SettingsTab | null;
	const [activeTab, setActiveTab] = useState<SettingsTab>(
		tabParam && isSettingsTab(tabParam) ? tabParam : "general",
	);

	// Update tab when URL changes
	useEffect(() => {
		if (tabParam && isSettingsTab(tabParam)) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	// Update URL when tab changes
	const handleTabChange = (tab: SettingsTab) => {
		setActiveTab(tab);
		router.push(`/settings?tab=${tab}`, { scroll: false });
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
				{/* Sidebar Navigation */}
				<BlurFade delay={0.15} inView>
					<nav className="lg:w-56 shrink-0">
						<div className="space-y-1">
							{sections.map((section, index) => (
								<BlurFade key={section.id} delay={0.2 + index * 0.05} inView>
									<button
										onClick={() => handleTabChange(section.id)}
										className={`flex w-full min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
											activeTab === section.id
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
									>
										<div className="flex items-center gap-3">
											{section.icon}
											<span>{section.label}</span>
										</div>
										<ChevronRight
											className={`h-4 w-4 transition-transform ${activeTab === section.id ? "rotate-90" : ""}`}
										/>
									</button>
								</BlurFade>
							))}
						</div>
					</nav>
				</BlurFade>

				{/* Main Content */}
				<div className="flex-1 min-w-0">{renderContent()}</div>
			</div>
		</div>
	);
}
