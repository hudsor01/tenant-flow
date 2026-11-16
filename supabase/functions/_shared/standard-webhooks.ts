// Standard Webhooks signature check (https://www.standardwebhooks.com), the
// scheme Supabase Auth uses to sign HTTP hook requests. Keep this file
// import-free and Deno-free: tsc compiles it for the Vitest tests under
// supabase/functions/__tests__/, and it only needs Web Crypto, which Deno and
// Node both provide on globalThis.

/** How far a request's timestamp may be from now, in seconds (the spec's default). */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export interface StandardWebhookHeaders {
	id: string | null;
	timestamp: string | null;
	signature: string | null;
}

export type StandardWebhookVerdict =
	| { ok: true }
	| {
			ok: false;
			reason:
				| "missing_headers"
				| "bad_timestamp"
				| "stale_timestamp"
				| "bad_secret"
				| "no_match";
	  };

/**
 * The secret's key bytes. Supabase shows the secret as `v1,whsec_<base64>`;
 * the spec signs with the base64-decoded part. Returns null for anything that
 * is not that shape, so a misconfigured secret refuses every request.
 */
function secretKeyBytes(secret: string): Uint8Array<ArrayBuffer> | null {
	const encoded = secret
		.trim()
		.replace(/^v1,/, "")
		.replace(/^whsec_/, "");
	if (encoded.length === 0) return null;
	try {
		const binary = atob(encoded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes.length > 0 ? bytes : null;
	} catch {
		return null;
	}
}

function toBase64(bytes: ArrayBuffer): string {
	let binary = "";
	for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
	return btoa(binary);
}

/** Compares two strings in time that depends only on their lengths. */
function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * Checks a Standard Webhooks request: the timestamp is within five minutes of
 * `nowSeconds`, and one of the `v1,<base64>` signatures in the header is the
 * HMAC-SHA256 of `${id}.${timestamp}.${body}` under one of the secrets.
 * `secrets` may hold several secrets separated by "|", as Supabase sends
 * during a rotation. `body` must be the raw request text, before any parsing.
 */
export async function verifyStandardWebhook(params: {
	body: string;
	headers: StandardWebhookHeaders;
	secrets: string;
	nowSeconds: number;
}): Promise<StandardWebhookVerdict> {
	const { id, timestamp, signature } = params.headers;
	if (!id || !timestamp || !signature) {
		return { ok: false, reason: "missing_headers" };
	}
	if (!/^\d+$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };
	if (
		Math.abs(params.nowSeconds - Number(timestamp)) >
		TIMESTAMP_TOLERANCE_SECONDS
	) {
		return { ok: false, reason: "stale_timestamp" };
	}

	const keys = params.secrets
		.split("|")
		.map(secretKeyBytes)
		.filter((key): key is Uint8Array<ArrayBuffer> => key !== null);
	if (keys.length === 0) return { ok: false, reason: "bad_secret" };

	const offered = signature
		.split(" ")
		.filter((part) => part.startsWith("v1,"))
		.map((part) => part.slice(3));
	const signedContent = new TextEncoder().encode(
		`${id}.${timestamp}.${params.body}`,
	);

	for (const keyBytes of keys) {
		const key = await crypto.subtle.importKey(
			"raw",
			keyBytes,
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const expected = toBase64(
			await crypto.subtle.sign("HMAC", key, signedContent),
		);
		if (offered.some((candidate) => constantTimeEqual(candidate, expected))) {
			return { ok: true };
		}
	}
	return { ok: false, reason: "no_match" };
}
