"use client";

import { CheckCircle2, Loader2, PenLine } from "lucide-react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";

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
};

/**
 * Tenant-facing electronic signing form. Posts to the public sign-lease-token
 * Edge Function (no account required — the token in the URL is the credential).
 */
export function SignLeaseForm({ token, tenantName }: SignLeaseFormProps) {
	const [name, setName] = useState(tenantName);
	const [consent, setConsent] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [signed, setSigned] = useState(false);
	const [bothSigned, setBothSigned] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = name.trim().length > 0 && consent && !submitting;

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
			} else {
				setError(
					SIGN_ERROR_MESSAGE[data.reason ?? "invalid_token"] ??
						"We couldn't record your signature. Please try again.",
				);
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

			<div className="flex items-start gap-3">
				<Checkbox
					id="sign-consent"
					checked={consent}
					onCheckedChange={(checked) => setConsent(checked === true)}
					data-testid="sign-consent-checkbox"
				/>
				<Label
					htmlFor="sign-consent"
					className="text-sm font-normal leading-relaxed cursor-pointer"
				>
					I have read the lease, consent to sign electronically, and agree to be
					legally bound by its terms.
				</Label>
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
