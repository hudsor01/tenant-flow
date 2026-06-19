// Pure logic for the public /sign/[token] page, extracted so it is unit-testable
// independent of the Server Component render.

import { formatCurrency } from "#lib/utils/currency";

export interface SigningLease {
	tenant_name: string | null;
	owner_name: string | null;
	property_label: string | null;
	unit_number: string | null;
	start_date: string | null;
	end_date: string | null;
	rent_amount: number | null;
}

export type ContextResponse =
	| { valid: true; reason: null; lease: SigningLease }
	| { valid: false; reason: string | null };

export const REASON_MESSAGE: Record<string, string> = {
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

/** Fetch the signing context for a token. All genuine token states arrive as
 *  200 + reason; any non-2xx / network fault maps to the recoverable
 *  `context_error` reason (never the permanent "invalid link"). */
export async function fetchContext(token: string): Promise<ContextResponse> {
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!baseUrl) return { valid: false, reason: "context_error" };
	try {
		const res = await fetch(`${baseUrl}/functions/v1/sign-lease-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "context", token }),
			cache: "no-store",
		});
		if (!res.ok) return { valid: false, reason: "context_error" };
		return (await res.json()) as ContextResponse;
	} catch {
		return { valid: false, reason: "context_error" };
	}
}

export function formatDate(value: string | null): string {
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

export function formatRent(value: number | null): string {
	if (value == null) return "N/A";
	// Use the canonical formatter (always 2 decimals) so the legally-binding rent
	// on the signing page matches the rest of the app.
	return `${formatCurrency(value)}/month`;
}

/** Non-error terminal reasons — the lease is already signed/active, not broken. */
export function isCompletedState(reason: string | null): boolean {
	return reason === "tenant_already_signed" || reason === "lease_active";
}

const INVALID_TOKEN_MESSAGE =
	"This signing link is invalid. Please check the link the landlord sent you.";

export function reasonMessage(reason: string | null): string {
	return REASON_MESSAGE[reason ?? "invalid_token"] ?? INVALID_TOKEN_MESSAGE;
}
