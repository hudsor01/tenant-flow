'use client'

import { Mail } from 'lucide-react'
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
import type { DeliverabilityStats } from '#types/analytics'
import { cn } from '#lib/utils'

// Operational thresholds. The Resend default send-block triggers at 5%
// bounce rate; 0.1% is the widely cited complaint-rate ceiling (SES,
// Postmark, and Resend docs all converge on this number).
const BOUNCE_WARN_PERCENT = 5
const COMPLAINT_WARN_PERCENT = 0.1

function formatPercent(value: number): string {
	return `${value.toFixed(2)}%`
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

export function DeliverabilityTable({ data }: { data: DeliverabilityStats[] }) {
	if (data.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Mail className="size-6 text-muted-foreground" aria-hidden />
					</EmptyMedia>
					<EmptyTitle>No deliverability data yet</EmptyTitle>
					<EmptyDescription>
						Events will appear here once Resend webhook events are ingested.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	// Sort by bounce rate descending — worst-performing template surfaces
	// first so admins triage operational problems without scrolling.
	const sorted = [...data].sort((a, b) => b.bouncePercent - a.bouncePercent)

	return (
		<div className="rounded-md border border-border bg-background">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Template</TableHead>
						<TableHead className="text-right">Sent</TableHead>
						<TableHead className="text-right">Delivered</TableHead>
						<TableHead className="text-right">Opened</TableHead>
						<TableHead className="text-right">Bounce %</TableHead>
						<TableHead className="text-right">Complaint %</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map(row => (
						<TableRow key={row.templateTag}>
							<TableCell className="font-medium text-foreground">
								{row.templateTag}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCount(row.sent)}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCount(row.delivered)}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCount(row.opened)}
							</TableCell>
							<TableCell
								className={cn(
									'text-right',
									row.bouncePercent > BOUNCE_WARN_PERCENT
										? 'text-destructive'
										: 'text-muted-foreground'
								)}
							>
								{formatPercent(row.bouncePercent)}
							</TableCell>
							<TableCell
								className={cn(
									'text-right',
									row.complaintPercent > COMPLAINT_WARN_PERCENT
										? 'text-destructive'
										: 'text-muted-foreground'
								)}
							>
								{formatPercent(row.complaintPercent)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
