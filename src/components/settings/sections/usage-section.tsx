"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileSignature, HardDrive } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { Progress } from "#components/ui/progress";
import { Skeleton } from "#components/ui/skeleton";
import { usageQueries } from "#hooks/api/query-keys/usage-keys";
import { formatBytes } from "#lib/format-bytes";

// Proactive upgrade surface (METER-02/03): a successful send / upload is gated
// server-side (Plan 01 RPC + Plan 04 trigger); this widget is UX-only. The
// near-cap prompt mirrors the reactive 402 rail — it fires at 80% of the cap.
const NEAR_CAP_THRESHOLD = 0.8;
const GB_IN_BYTES = 1024 * 1024 * 1024;

function usageRatio(used: number, limit: number): number {
	return limit > 0 ? used / limit : 0;
}

function progressVariant(ratio: number): "default" | "warning" | "destructive" {
	if (ratio >= 1) return "destructive";
	if (ratio >= NEAR_CAP_THRESHOLD) return "warning";
	return "default";
}

// Full literal CTA targets (keeps the Stripe checkout source attribution and
// makes the exact upgrade route greppable): esign_quota is the proactive twin
// of the reactive 402 rail; storage_quota_gate matches the storage gate source.
const ESIGN_UPGRADE_HREF = "/billing/plans?source=esign_quota";
const STORAGE_UPGRADE_HREF = "/billing/plans?source=storage_quota_gate";

function UpgradePrompt({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
			<AlertTriangle
				className="mt-0.5 h-4 w-4 shrink-0 text-warning"
				aria-hidden="true"
			/>
			<p className="text-sm text-muted-foreground">
				{children}{" "}
				<Link
					href={href}
					className="font-medium text-primary-text hover:underline underline-offset-4"
				>
					Upgrade your plan
				</Link>
			</p>
		</div>
	);
}

function WidgetShell({
	icon: Icon,
	title,
	children,
}: {
	icon: typeof FileSignature;
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
				<span className="text-sm font-medium">{title}</span>
			</div>
			{children}
		</div>
	);
}

function EsignUsageWidget() {
	const { data, isLoading, isError } = useQuery(usageQueries.esign());

	if (isLoading) return <Skeleton className="h-16 rounded-md" />;
	if (isError || !data) {
		return (
			<WidgetShell icon={FileSignature} title="Lease e-signs">
				<p className="text-sm text-muted-foreground">
					Usage is temporarily unavailable.
				</p>
			</WidgetShell>
		);
	}

	if (data.unlimited) {
		return (
			<WidgetShell icon={FileSignature} title="Lease e-signs">
				<p className="text-sm text-muted-foreground">Unlimited e-signs</p>
			</WidgetShell>
		);
	}

	const ratio = usageRatio(data.used, data.cap);
	const nearCap = ratio >= NEAR_CAP_THRESHOLD;

	return (
		<WidgetShell icon={FileSignature} title="Lease e-signs">
			<p className="text-sm text-muted-foreground">
				{data.used} of {data.cap} lease e-signs used this month
			</p>
			<Progress
				value={Math.min(100, Math.round(ratio * 100))}
				variant={progressVariant(ratio)}
				aria-label="E-sign usage this month"
			/>
			{nearCap && (
				<UpgradePrompt href={ESIGN_UPGRADE_HREF}>
					You&apos;re approaching your monthly e-sign limit.
				</UpgradePrompt>
			)}
		</WidgetShell>
	);
}

function StorageUsageWidget() {
	const { data, isLoading, isError } = useQuery(usageQueries.storage());

	if (isLoading) return <Skeleton className="h-16 rounded-md" />;
	if (isError || !data) {
		return (
			<WidgetShell icon={HardDrive} title="Storage">
				<p className="text-sm text-muted-foreground">
					Usage is temporarily unavailable.
				</p>
			</WidgetShell>
		);
	}

	if (data.unlimited) {
		return (
			<WidgetShell icon={HardDrive} title="Storage">
				<p className="text-sm text-muted-foreground">Unlimited storage</p>
			</WidgetShell>
		);
	}

	const limitBytes = data.limitGb * GB_IN_BYTES;
	const ratio = usageRatio(data.usedBytes, limitBytes);
	const nearCap = ratio >= NEAR_CAP_THRESHOLD;

	return (
		<WidgetShell icon={HardDrive} title="Storage">
			<p className="text-sm text-muted-foreground">
				{formatBytes(data.usedBytes)} of {data.limitGb} GB used
			</p>
			<Progress
				value={Math.min(100, Math.round(ratio * 100))}
				variant={progressVariant(ratio)}
				aria-label="Storage usage"
			/>
			{nearCap && (
				<UpgradePrompt href={STORAGE_UPGRADE_HREF}>
					You&apos;re approaching your storage quota.
				</UpgradePrompt>
			)}
		</WidgetShell>
	);
}

export function UsageSection() {
	return (
		<BlurFade delay={0.25} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Usage
				</h3>
				<div className="space-y-6">
					<EsignUsageWidget />
					<StorageUsageWidget />
				</div>
			</section>
		</BlurFade>
	);
}
