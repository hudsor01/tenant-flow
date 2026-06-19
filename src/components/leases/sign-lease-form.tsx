"use client";

import { CheckCircle2, FileText, Loader2, PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { cn } from "#lib/utils";

interface SignLeaseFormProps {
	token: string;
	tenantName: string;
}

const SIGN_ERROR_MESSAGE: Record<string, string> = {
	consent_and_name_required:
		"Please type your full name and accept the consent to continue.",
	expired_token:
		"This signing link has expired. Ask the landlord to resend it.",
	revoked_token: "This signing link is no longer valid.",
	used_token: "This signing link has already been used.",
	invalid_token: "This signing link is invalid.",
	lease_not_pending_signature:
		"This lease is no longer awaiting your signature.",
	tenant_already_signed: "You have already signed this lease.",
	tenant_changed:
		"This signing link is no longer valid for the current tenant. Ask the landlord for a new one.",
};

/**
 * Tenant-facing electronic signing form. Posts to the public sign-lease-token
 * Edge Function (no account required — the token in the URL is the credential).
 */
export function SignLeaseForm({ token, tenantName }: SignLeaseFormProps) {
	const [name, setName] = useState(tenantName);
	const [consent, setConsent] = useState(false);
	const [viewed, setViewed] = useState(false);
	const [viewing, setViewing] = useState(false);
	const [docFallbackUrl, setDocFallbackUrl] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [signed, setSigned] = useState(false);
	const [bothSigned, setBothSigned] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fallbackUrlRef = useRef<string | null>(null);
	// Whether the lease has been successfully opened at least once.
	const hasViewedOnceRef = useRef(false);

	const canSubmit = name.trim().length > 0 && viewed && consent && !submitting;

	// Revoke any outstanding fallback blob URL on unmount.
	useEffect(
		() => () => {
			if (fallbackUrlRef.current) URL.revokeObjectURL(fallbackUrlRef.current);
		},
		[],
	);

	const handleViewLease = async () => {
		setError(null);
		setViewing(true);
		// Opening the document is what the tenant attests to; capture intent on the
		// action itself so a slow/blocked render can't deadlock the consent gate.
		setViewed(true);
		try {
			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const res = await fetch(`${baseUrl}/functions/v1/sign-lease-token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "document", token }),
			});
			if (!res.ok) throw new Error("Unable to load the lease document");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			// Revoke a prior fallback blob before replacing it (repeated blocked
			// clicks would otherwise orphan blobs).
			if (fallbackUrlRef.current) {
				URL.revokeObjectURL(fallbackUrlRef.current);
				fallbackUrlRef.current = null;
			}
			const win = window.open(url, "_blank", "noopener,noreferrer");
			hasViewedOnceRef.current = true;
			if (win) {
				setDocFallbackUrl(null);
				setTimeout(() => URL.revokeObjectURL(url), 60_000);
			} else {
				// The async open lost the click's user-gesture, so the popup was
				// blocked. Surface a link the tenant can open within a fresh click.
				fallbackUrlRef.current = url;
				setDocFallbackUrl(url);
			}
		} catch {
			// Re-lock the consent gate ONLY if the lease was never successfully
			// opened — so a tenant can't attest to a lease they never retrieved, but
			// a failed *reopen* doesn't downgrade an already-passed gate.
			if (!hasViewedOnceRef.current) setViewed(false);
			setError(
				"We couldn't open the lease document. Please try again or contact the landlord.",
			);
		} finally {
			setViewing(false);
		}
	};

	const handleSign = async () => {
		setError(null);
		setSubmitting(true);
		try {
			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const res = await fetch(`${baseUrl}/functions/v1/sign-lease-token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "sign",
					token,
					signerName: name.trim(),
					consent: true,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				both_signed?: boolean;
				reason?: string;
			};
			if (data.success) {
				setBothSigned(data.both_signed === true);
				setSigned(true);
			} else if (data.reason) {
				// Map only an explicit reason; a server error carries none and must
				// not be reported as a permanently-invalid link.
				setError(
					SIGN_ERROR_MESSAGE[data.reason] ??
						"We couldn't record your signature. Please try again.",
				);
			} else {
				setError("We couldn't record your signature. Please try again.");
			}
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	if (signed) {
		return (
			<div
				className="flex flex-col items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-6 text-center"
				data-testid="sign-lease-success"
				role="status"
				aria-live="polite"
			>
				<CheckCircle2 className="h-10 w-10 text-success" />
				<p className="text-base font-semibold text-foreground">
					Your signature has been recorded
				</p>
				<p className="text-sm text-muted-foreground">
					{bothSigned
						? "All parties have signed. This lease is now active. You can close this page."
						: "Thank you. The landlord will be notified once all parties have signed."}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<div className="rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
				<p className="mb-2 font-medium text-foreground">
					Consent to sign electronically
				</p>
				<p>
					By signing below you agree to use an electronic signature for this
					lease under the U.S. ESIGN Act and applicable state law, and that your
					electronic signature is legally binding and equivalent to a
					handwritten one. You may request a paper copy from the landlord. Your
					name, the date and time, and your IP address are recorded with your
					signature.
				</p>
			</div>

			<Button
				type="button"
				variant="outline"
				onClick={handleViewLease}
				disabled={viewing}
				className="w-full gap-2"
				data-testid="view-lease-button"
			>
				{viewing ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<FileText className="h-4 w-4" />
				)}
				{viewed ? "Reopen the full lease" : "Read the full lease"}
			</Button>

			{docFallbackUrl ? (
				<a
					href={docFallbackUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="block text-center text-sm text-primary underline"
					data-testid="view-lease-fallback-link"
				>
					Your browser blocked the document window — open the lease here
				</a>
			) : null}

			<div className="space-y-2">
				<Label htmlFor="signer-name">Type your full legal name</Label>
				<Input
					id="signer-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Your full name"
					autoComplete="name"
					autoFocus
					data-testid="signer-name-input"
				/>
			</div>

			<div className={cn("flex items-start gap-3", !viewed && "opacity-60")}>
				<Checkbox
					id="sign-consent"
					checked={consent}
					disabled={!viewed}
					onCheckedChange={(checked) => setConsent(checked === true)}
					aria-describedby={!viewed ? "sign-consent-hint" : undefined}
					data-testid="sign-consent-checkbox"
				/>
				<div className="space-y-1">
					<Label
						htmlFor="sign-consent"
						className="text-sm font-normal leading-relaxed cursor-pointer"
					>
						I have read the lease, consent to sign electronically, and agree to
						be legally bound by its terms.
					</Label>
					{!viewed ? (
						<p id="sign-consent-hint" className="text-xs text-muted-foreground">
							Open the lease above to enable this checkbox.
						</p>
					) : null}
				</div>
			</div>

			{error ? (
				<p className="text-sm text-destructive-text" role="alert">
					{error}
				</p>
			) : null}

			<Button
				type="button"
				onClick={handleSign}
				disabled={!canSubmit}
				className="w-full gap-2"
				data-testid="sign-lease-submit"
			>
				{submitting ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<PenLine className="h-4 w-4" />
				)}
				{submitting ? "Signing..." : "Sign Lease"}
			</Button>
		</div>
	);
}
