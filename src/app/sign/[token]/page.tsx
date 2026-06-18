import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { Metadata } from "next";
import { SignLeaseForm } from "#components/leases/sign-lease-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";

export const metadata: Metadata = {
	title: "Sign Your Lease",
	description:
		"Review and electronically sign your residential lease agreement.",
	robots: { index: false, follow: false },
};

// The signing token is the credential and the page must always reflect live
// token/lease state — never cache.
export const dynamic = "force-dynamic";

interface SigningLease {
	tenant_name: string | null;
	owner_name: string | null;
	property_label: string | null;
	unit_number: string | null;
	start_date: string | null;
	end_date: string | null;
	rent_amount: number | null;
}

type ContextResponse =
	| { valid: true; reason: null; lease: SigningLease }
	| { valid: false; reason: string | null };

const REASON_MESSAGE: Record<string, string> = {
	invalid_token:
		"This signing link is invalid. Please check the link the landlord sent you.",
	expired_token:
		"This signing link has expired. Ask the landlord to resend it.",
	revoked_token:
		"This signing link is no longer valid. Ask the landlord for a new one.",
	used_token: "This signing link has already been used.",
	tenant_already_signed:
		"You have already signed this lease. No further action is needed.",
	lease_active: "This lease has already been fully signed and is active.",
	lease_not_pending: "This lease is not currently awaiting your signature.",
	tenant_changed:
		"This signing link is no longer valid for the current tenant. Ask the landlord for a new one.",
	// Transient server/DB fault — recoverable, NOT a broken link.
	context_error:
		"We couldn't load this lease right now. Please refresh the page and try again.",
};

async function fetchContext(token: string): Promise<ContextResponse> {
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!baseUrl) return { valid: false, reason: "context_error" };
	try {
		const res = await fetch(`${baseUrl}/functions/v1/sign-lease-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "context", token }),
			cache: "no-store",
		});
		// All genuine token states arrive as 200 + reason; a non-2xx here is a
		// server fault, so show recoverable copy rather than "invalid link".
		if (!res.ok) return { valid: false, reason: "context_error" };
		return (await res.json()) as ContextResponse;
	} catch {
		return { valid: false, reason: "context_error" };
	}
}

function formatDate(value: string | null): string {
	if (!value) return "N/A";
	const d = new Date(`${value}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return "N/A";
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
}

function formatRent(value: number | null): string {
	if (value == null) return "N/A";
	return `$${value.toLocaleString("en-US")}/month`;
}

/** Non-error terminal reasons — the lease is already signed/active, not broken. */
function isCompletedState(reason: string | null): boolean {
	return reason === "tenant_already_signed" || reason === "lease_active";
}

export default async function SignLeasePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const context = await fetchContext(token);

	return (
		<main className="min-h-dvh bg-muted/40 px-4 py-10">
			<div className="mx-auto w-full max-w-2xl">
				<h1 className="sr-only">Review and sign your lease agreement</h1>
				<div className="mb-6 text-center">
					<span className="text-xl font-bold tracking-tight text-foreground">
						TenantFlow
					</span>
				</div>

				{context.valid ? (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5 text-primary" />
								Review &amp; Sign Your Lease
							</CardTitle>
							<CardDescription>
								{context.lease.owner_name ?? "The landlord"} has sent you this
								residential lease agreement to review and sign electronically.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<dl className="grid gap-3 rounded-lg border bg-background p-4 text-sm">
								<SummaryRow
									label="Property"
									value={context.lease.property_label}
								/>
								{context.lease.unit_number ? (
									<SummaryRow label="Unit" value={context.lease.unit_number} />
								) : null}
								<SummaryRow label="Tenant" value={context.lease.tenant_name} />
								<SummaryRow label="Landlord" value={context.lease.owner_name} />
								<SummaryRow
									label="Lease Start"
									value={formatDate(context.lease.start_date)}
								/>
								<SummaryRow
									label="Lease End"
									value={formatDate(context.lease.end_date)}
								/>
								<SummaryRow
									label="Monthly Rent"
									value={formatRent(context.lease.rent_amount)}
								/>
							</dl>

							<SignLeaseForm
								token={token}
								tenantName={context.lease.tenant_name ?? ""}
							/>
						</CardContent>
					</Card>
				) : isCompletedState(context.reason) ? (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CheckCircle2 className="h-5 w-5 text-success" />
								{context.reason === "lease_active"
									? "Lease is active"
									: "Already signed"}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{REASON_MESSAGE[context.reason ?? "invalid_token"] ??
									REASON_MESSAGE.invalid_token}
							</p>
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertCircle className="h-5 w-5 text-warning" />
								Signing link unavailable
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{REASON_MESSAGE[context.reason ?? "invalid_token"] ??
									REASON_MESSAGE.invalid_token}
							</p>
						</CardContent>
					</Card>
				)}

				<p className="mt-6 text-center text-xs text-muted-foreground">
					Secured by TenantFlow. This link is unique to you.
				</p>
			</div>
		</main>
	);
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<dt className="font-medium text-muted-foreground">{label}</dt>
			<dd className="text-right text-foreground">{value ?? "N/A"}</dd>
		</div>
	);
}
