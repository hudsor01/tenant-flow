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
 * In place of a statement's or the tax documents' figures when the server
 * returns none of the rent ledger totals they are built on
 * (get_billing_insights before 20261102055449). The page's selectors and its
 * export control (a statement's Export, the tax documents' Download PDF) stay,
 * so the owner can still pick another period or year; every one is
 * unavailable in that state, and the control says why.
 */
export function LedgerTotalsUnavailable({
	description,
	onRetryAction,
}: {
	/** What on this page comes from the ledger, ending in a full stop. */
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
					<EmptyDescription className="mb-0">
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
