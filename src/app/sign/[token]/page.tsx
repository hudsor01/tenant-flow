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
import {
	fetchContext,
	formatDate,
	formatRent,
	isCompletedState,
	reasonMessage,
} from "./sign-context";

export const metadata: Metadata = {
	title: "Sign Your Lease",
	description:
		"Review and electronically sign your residential lease agreement.",
	robots: { index: false, follow: false },
};

// The signing token is the credential and the page must always reflect live
// token/lease state — never cache.
export const dynamic = "force-dynamic";

export default async function SignLeasePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const context = await fetchContext(token);

	return (
		<main id="main-content" className="min-h-dvh bg-muted/40 px-4 py-10">
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
								{reasonMessage(context.reason)}
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
								{reasonMessage(context.reason)}
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
