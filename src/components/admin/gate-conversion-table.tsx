'use client'

import { DollarSign } from 'lucide-react'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import type { GateConversionStats } from '#types/analytics'
import { cn } from '#lib/utils'

// A paywall that fails to convert ≥10% of the users who hit it is almost
// certainly not pulling its weight. v2.0 Phase 45's battle-proven bar is
// 5 upgrades / 7 days — conversion_rate matters more than absolute counts.
const LOW_CONVERSION_THRESHOLD = 0.1

const FEATURE_LABELS: Record<string, string> = {
	esign: 'E-signature (DocuSeal)',
	premium_reports: 'Premium reports',
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

function formatRate(value: number | null): string {
	if (value === null) return '—'
	return `${(value * 100).toFixed(1)}%`
}

export function GateConversionTable({ data }: { data: GateConversionStats[] }) {
	if (data.length === 0 || data.every(row => row.gateHits === 0)) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<DollarSign className="size-6 text-muted-foreground" aria-hidden />
					</EmptyMedia>
					<EmptyTitle>No paywall events yet</EmptyTitle>
					<EmptyDescription>
						Rows appear here once Free-tier users hit a gated feature. The v2.0 Phase 45
						bar is ≥5 upgrades with <code>metadata.source = esign_gate</code> in any
						rolling 7-day window.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	// Sort by total hits descending — the paywall with the most traffic is
	// the most important to optimize.
	const sorted = [...data].sort((a, b) => b.gateHits - a.gateHits)

	return (
		<div className="rounded-md border border-border bg-background">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Feature gate</TableHead>
						<TableHead className="text-right">Gate hits</TableHead>
						<TableHead className="text-right">Unique users</TableHead>
						<TableHead className="text-right">Upgrades</TableHead>
						<TableHead className="text-right">Conversion</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map(row => (
						<TableRow key={row.feature}>
							<TableCell className="font-medium text-foreground">
								{FEATURE_LABELS[row.feature] ?? row.feature}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCount(row.gateHits)}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCount(row.distinctUsersHit)}
							</TableCell>
							<TableCell className="text-right text-foreground font-medium">
								{formatCount(row.upgradesFromGate)}
							</TableCell>
							<TableCell
								className={cn(
									'text-right',
									row.conversionRate !== null &&
										row.conversionRate < LOW_CONVERSION_THRESHOLD
										? 'text-destructive'
										: 'text-muted-foreground'
								)}
							>
								{formatRate(row.conversionRate)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
