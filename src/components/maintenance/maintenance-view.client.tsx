"use client";

import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Plus,
	Wrench,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { NumberTicker } from "#components/ui/number-ticker";
import { Skeleton } from "#components/ui/skeleton";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import { maintenanceQueries } from "#hooks/api/query-keys/maintenance-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";
import { usePreferencesStore } from "#providers/preferences-provider";
import type { MaintenanceDisplayRequest } from "#types/sections/maintenance";
import {
	MaintenanceInsightsTab,
	MaintenanceOverviewTab,
} from "./maintenance-view-tabs";

type ViewType = "kanban" | "table";

export function MaintenanceViewClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const viewPreferences = usePreferencesStore((state) => state.viewPreferences);
	const setViewPreference = usePreferencesStore(
		(state) => state.setViewPreference,
	);
	const currentView = (viewPreferences?.maintenance ?? "kanban") as ViewType;

	const tabFromUrl = searchParams.get("tab") || "overview";
	const [activeTab, setActiveTab] = useState(tabFromUrl);

	// DASH-18: URL-driven unit scope. The lease detail's "Maintenance Requests"
	// quick action links `/maintenance?unit_id=…`; the query factory already
	// applies `.eq("unit_id", …)` so the filter is a pure param wiring.
	const unitIdFilter = searchParams.get("unit_id");
	const { data: filterUnit } = useQuery({
		...unitQueries.detail(unitIdFilter ?? ""),
		enabled: !!unitIdFilter,
	});

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		const url = new URL(window.location.href);
		if (value === "overview") {
			url.searchParams.delete("tab");
		} else {
			url.searchParams.set("tab", value);
		}
		router.replace(url.pathname + url.search, { scroll: false });
	};

	const [searchQuery, setSearchQuery] = useState("");

	const { data: response, isLoading } = useQuery(
		maintenanceQueries.list(
			unitIdFilter ? { unit_id: unitIdFilter } : undefined,
		),
	);
	const requests = (response?.data ?? []) as MaintenanceDisplayRequest[];
	// Stat cards come from the get_maintenance_stats RPC (counts the owner's FULL
	// set) instead of the paginated list() (capped at 50), so they stay accurate
	// for large portfolios. `completed_this_month` is scoped to the caller's local
	// month boundary inside the stats() factory.
	const { data: stats } = useQuery(maintenanceQueries.stats());

	const handleViewChange = (view: ViewType) => {
		setViewPreference("maintenance", view);
	};

	const openCount = stats?.open ?? 0;
	const inProgressCount = stats?.in_progress ?? 0;
	const completedCount = stats?.completed_this_month ?? 0;
	const urgentCount = stats?.urgent ?? 0;

	// Filter requests
	const filteredRequests = (() => {
		if (!searchQuery) return requests;
		const query = searchQuery.toLowerCase();
		return requests.filter((r) => {
			const title = r.title?.toLowerCase() ?? "";
			const description = r.description?.toLowerCase() ?? "";
			const propertyName = r.property?.name?.toLowerCase() ?? "";
			return (
				title.includes(query) ||
				description.includes(query) ||
				propertyName.includes(query)
			);
		});
	})();

	const handleViewAnalytics = () => {
		router.push("/reports/analytics");
	};

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
				<div className="flex gap-3 mb-6">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-16 w-40 rounded-lg" />
					))}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-64 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					{unitIdFilter ? (
						<Empty>
							<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
								<Wrench />
							</EmptyMedia>
							<EmptyHeader>
								<EmptyTitle>No maintenance requests for this unit</EmptyTitle>
								<EmptyDescription>
									{filterUnit?.unit_number
										? `Unit ${filterUnit.unit_number} has no maintenance requests yet.`
										: "This unit has no maintenance requests yet."}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									variant="outline"
									onClick={() => router.replace("/maintenance")}
								>
									Clear filter
								</Button>
							</EmptyContent>
						</Empty>
					) : (
						<Empty>
							<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
								<Wrench />
							</EmptyMedia>
							<EmptyHeader>
								<EmptyTitle>No maintenance requests</EmptyTitle>
								<EmptyDescription>
									Log a request to track repairs, costs, and vendor assignments
									for a unit.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild>
									<Link href="/maintenance/new">
										<Plus className="w-5 h-5 mr-2" />
										Create Request
									</Link>
								</Button>
							</EmptyContent>
						</Empty>
					)}
				</BlurFade>
			</div>
		);
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Maintenance</h1>
						<p className="text-muted-foreground">
							Track and manage maintenance requests
						</p>
					</div>
					<Link
						href="/maintenance/new"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Request
					</Link>
				</div>
			</BlurFade>

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{openCount > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="var(--color-warning)"
								colorTo="oklch(from var(--color-warning) l c h / 0.3)"
							/>
						)}
						<StatLabel>Open</StatLabel>
						{/* warning/success stat numbers use -text companions: at 32px (typography-stat)
						    text-warning/text-success measure 2.15/2.59:1 in light, below the AA-large 3:1
						    bar; the Urgent stat below keeps vivid text-destructive (4.55/3.29:1, clears it). */}
						<StatValue className="flex items-baseline text-warning-text">
							<NumberTicker value={openCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting action</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Progress</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={inProgressCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<AlertTriangle />
						</StatIndicator>
						<StatDescription>being worked on</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Completed</StatLabel>
						<StatValue className="flex items-baseline text-success-text">
							<NumberTicker value={completedCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{urgentCount > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="var(--color-destructive)"
								colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
							/>
						)}
						<StatLabel>Urgent</StatLabel>
						<StatValue className="flex items-baseline text-destructive">
							<NumberTicker value={urgentCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<Wrench />
						</StatIndicator>
						<StatDescription>
							{urgentCount > 0 ? "needs attention" : "all clear"}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* DASH-18: unit-scope indicator when filtered via ?unit_id= */}
			{unitIdFilter && (
				<div className="mb-4 flex items-center">
					<span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
						Filtered to unit {filterUnit?.unit_number ?? "one unit"}
						<button
							type="button"
							onClick={() => router.replace("/maintenance")}
							aria-label="Clear unit filter"
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					</span>
				</div>
			)}

			{/* Tabbed Content */}
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="mb-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="insights">Insights</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">
					<MaintenanceOverviewTab
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						currentView={currentView}
						onViewChange={handleViewChange}
						filteredRequests={filteredRequests}
						onViewAnalytics={handleViewAnalytics}
					/>
				</TabsContent>
				<TabsContent value="insights">
					<MaintenanceInsightsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
