"use client";

import { ReceiptText } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";

/**
 * In place of a statement's figures when the server returns none of the rent
 * ledger totals it is built on (get_billing_insights before 20261102055449).
 * The page's selectors and Export button stay, so the owner can still pick
 * another period; every period is unavailable in that state, and Export says
 * why.
 */
export function LedgerTotalsUnavailable({
	description,
	onRetryAction,
}: {
	/** What on this statement comes from the ledger, ending in a full stop. */
	description: string;
	onRetryAction: () => void;
}) {
	return (
		<BlurFade delay={0.15}>
			<Empty className="border border-border bg-card">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ReceiptText aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Ledger totals unavailable</EmptyTitle>
					<EmptyDescription>
						{description} Its totals aren&apos;t available yet. Try again later.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button variant="outline" onClick={onRetryAction}>
						Try Again
					</Button>
				</EmptyContent>
			</Empty>
		</BlurFade>
	);
}
