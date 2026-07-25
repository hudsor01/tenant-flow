"use client";

/**
 * One row of the per-lease ledger table (LEDGER-03/05/06).
 *
 * Purely presentational: every derived value (the running balance, the
 * paid/partial/unpaid/late state, whether this row was reversed) is computed
 * once in `ledger-tab.tsx` by `ledger-math` and handed down, so the derivation
 * lives in exactly one place and this row cannot invent a second rule.
 *
 * APPEND-ONLY (D-06): there is no edit or delete affordance here by design. The
 * only correction is "Reverse entry", which APPENDS an offsetting row; the
 * original stays on the ledger, dimmed and struck through, permanently.
 *
 * MONEY (D-00): every figure is `numeric(10,2)` DOLLARS rendered through
 * `formatCurrency`. No cents representation exists in this subsystem.
 */

import { format, parseISO } from "date-fns";
import {
	CircleCheck,
	CircleDashed,
	Flag,
	TriangleAlert,
	Undo2,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { TableCell, TableRow } from "#components/ui/table";
import type { LedgerEntryRow } from "#hooks/api/query-keys/rent-ledger-keys";
import type { ChargeState } from "#lib/ledger/ledger-math";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";

/** Human labels for the `type` discriminator (charges) and receipt rows. */
export const LEDGER_TYPE_LABELS: Record<string, string> = {
	rent: "Rent",
	late_fee: "Late fee",
	manual_charge: "Other charge",
	credit: "Credit",
	opening: "Opening balance",
	receipt: "Receipt",
};

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;
type LedgerIcon = typeof CircleCheck;

/**
 * The UI-SPEC's semantic ledger-state palette. The vivid token tints the chip
 * and its AA-safe `-text` companion carries the label (both baked into the
 * Badge variant), with a lucide glyph alongside.
 */
const STATE_BADGES: Record<
	ChargeState,
	{ label: string; variant: BadgeVariant; Icon: LedgerIcon }
> = {
	paid: { label: "Paid", variant: "success", Icon: CircleCheck },
	partial: { label: "Partial", variant: "warning", Icon: CircleDashed },
	unpaid: { label: "Unpaid", variant: "secondary", Icon: CircleDashed },
	late: { label: "Late", variant: "destructive", Icon: TriangleAlert },
};

/** `2026-07-01` renders as `Jul 1, 2026`; an unparseable value renders as-is. */
function formatEntryDate(entryDate: string): string {
	const parsed = parseISO(entryDate);
	return Number.isNaN(parsed.getTime())
		? entryDate
		: format(parsed, "MMM d, yyyy");
}

function EntryBadge({
	entry,
	state,
	isVoided,
}: {
	entry: LedgerEntryRow;
	state: ChargeState | null;
	isVoided: boolean;
}) {
	if (isVoided) {
		return (
			<Badge variant="outline" size="sm">
				<Undo2 aria-hidden="true" />
				Reversed
			</Badge>
		);
	}
	if (entry.type === "opening") {
		return (
			<Badge variant="outline" size="sm">
				<Flag aria-hidden="true" />
				Opening balance
			</Badge>
		);
	}
	if (entry.type === "credit") {
		return (
			<Badge variant="info" size="sm">
				<Undo2 aria-hidden="true" />
				Credit
			</Badge>
		);
	}
	if (!state) return null;

	const { label, variant, Icon } = STATE_BADGES[state];
	return (
		<Badge variant={variant} size="sm">
			<Icon aria-hidden="true" />
			{label}
		</Badge>
	);
}

export interface LedgerTableRowProps {
	entry: LedgerEntryRow;
	/** Cumulative lease balance after this entry, in dollars. */
	runningBalance: number;
	/** Derived charge state; null for receipts and for non-charge rows. */
	state: ChargeState | null;
	/** True when a later entry reverses this one, or this entry IS a reversal. */
	isVoided: boolean;
	/** Absent when the row cannot be reversed (already voided, or a reversal). */
	onReverse?: () => void;
}

export function LedgerTableRow({
	entry,
	runningBalance,
	state,
	isVoided,
	onReverse,
}: LedgerTableRowProps) {
	const typeLabel = LEDGER_TYPE_LABELS[entry.type] ?? "Charge";
	const amountClass = cn("text-right tabular-nums", isVoided && "line-through");

	return (
		<TableRow className={cn(isVoided && "text-muted-foreground opacity-60")}>
			<TableCell className="whitespace-nowrap">
				{formatEntryDate(entry.entryDate)}
			</TableCell>
			<TableCell className="min-w-40">
				{entry.description ?? typeLabel}
				{entry.method ? (
					<span className="block text-xs text-muted-foreground">
						{entry.method}
					</span>
				) : null}
			</TableCell>
			<TableCell className="whitespace-nowrap">{typeLabel}</TableCell>
			<TableCell className={amountClass}>
				{entry.kind === "charge" ? formatCurrency(entry.amount) : null}
			</TableCell>
			<TableCell className={amountClass}>
				{entry.kind === "receipt" ? formatCurrency(entry.amount) : null}
			</TableCell>
			<TableCell className="text-right font-semibold tabular-nums">
				{formatCurrency(runningBalance)}
			</TableCell>
			<TableCell>
				<EntryBadge entry={entry} state={state} isVoided={isVoided} />
			</TableCell>
			<TableCell className="text-right">
				{onReverse ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Reverse entry"
						onClick={onReverse}
					>
						<Undo2 className="size-4" aria-hidden="true" />
					</Button>
				) : null}
			</TableCell>
		</TableRow>
	);
}
