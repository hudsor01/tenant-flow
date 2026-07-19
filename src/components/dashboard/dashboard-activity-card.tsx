"use client";

import {
	Activity,
	Building2,
	FileText,
	FileUp,
	type LucideIcon,
	User,
	Wrench,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Skeleton } from "#components/ui/skeleton";
import { useDashboardActivity } from "#hooks/api/use-dashboard-hooks";
import { formatRelativeDate } from "#lib/formatters/date";
import type { ActivityItem } from "#types/activity";

// ACT-02 semantic type-icon palette (52-UI-SPEC "Semantic type-icon palette").
// Each entity type maps to a lucide glyph + an icon-chip utility (10% vivid
// background) whose companion `-text` glyph token is AA-safe in both themes.
// The `document -> FileUp` mapping is required: document-upload is one of the
// four launch activity events.
const ACTIVITY_ICONS: Record<
	string,
	{ icon: LucideIcon; chip: string; glyph: string }
> = {
	property: {
		icon: Building2,
		chip: "activity-property",
		glyph: "text-primary-text",
	},
	lease: { icon: FileText, chip: "activity-lease", glyph: "text-primary-text" },
	document: { icon: FileUp, chip: "icon-bg-info", glyph: "text-info-text" },
	maintenance: {
		icon: Wrench,
		chip: "activity-maintenance",
		glyph: "text-info-text",
	},
	maintenance_request: {
		icon: Wrench,
		chip: "activity-maintenance",
		glyph: "text-info-text",
	},
	tenant: { icon: User, chip: "activity-tenant", glyph: "text-warning-text" },
};

const FALLBACK_ICON = {
	icon: Activity,
	chip: "bg-muted",
	glyph: "text-muted-foreground",
};

function iconFor(entityType: string) {
	return ACTIVITY_ICONS[entityType] ?? FALLBACK_ICON;
}

// ACT-02 asymmetry: an activity row is pure audit — no unread dot, no count
// badge, no read affordance, no deep-link chevron, no read state. That visual
// contrast with the notification row is the disambiguation (D-08).
function ActivityRow({ item }: { item: ActivityItem }) {
	const { icon: Icon, chip, glyph } = iconFor(item.entityType);
	const timestamp = formatRelativeDate(item.created_at);

	return (
		<li className="flex items-center gap-3 py-3">
			<span
				className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${chip}`}
			>
				<Icon className={`size-4 ${glyph}`} aria-hidden="true" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-normal text-foreground">
					{item.action}
					{item.entityName ? ` · ${item.entityName}` : ""}
				</p>
				{timestamp ? (
					<p className="truncate text-xs text-muted-foreground">{timestamp}</p>
				) : null}
			</div>
		</li>
	);
}

export function DashboardActivityCard() {
	const { data, isLoading } = useDashboardActivity();
	const activity = data ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Activity
						className="size-4 text-muted-foreground"
						aria-hidden="true"
					/>
					Recent activity
				</CardTitle>
				<CardDescription>
					Everything happening across your portfolio
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : activity.length === 0 ? (
					<Empty className="border-none p-6">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Activity aria-hidden="true" />
							</EmptyMedia>
							<EmptyTitle>No activity yet</EmptyTitle>
							<EmptyDescription>
								Your leases, edits, and uploads show up here as you work.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="divide-y divide-border">
						{activity.slice(0, 10).map((item) => (
							<ActivityRow key={item.id} item={item} />
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
