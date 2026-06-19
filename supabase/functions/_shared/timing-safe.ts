// Shared constant-time string compare for Edge Functions.
//
// Lifted from the proven resend-webhook pattern (resend-webhook/index.ts:145-168):
// crypto.subtle.timingSafeEqual when the runtime exposes it, with an XOR-loop
// fallback for portability across Deno runtimes that lack it.
//
// IMPORTANT: this compares RAW secret strings directly (no HMAC). It is for
// callers that hold a shared secret and need a constant-time equality check —
// e.g. auth-email-send comparing the Authorization Bearer token against
// SUPABASE_AUTH_HOOK_SECRET. The other webhooks (resend/n8n) compare an
// HMAC digest against a computed digest; those keep their own HMAC machinery.
//
// The `crypto.subtle as unknown as { ... }` below is a runtime feature-detection
// shim (matching resend-webhook:151), NOT an RPC/PostgREST boundary cast — so it
// is outside the scope of CLAUDE.md rule #8 (which targets RPC/PostgREST returns).

export function timingSafeEqualStr(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const ab = enc.encode(a);
	const bb = enc.encode(b);
	// Early-return on length mismatch is acceptable: the secret's length is not
	// itself secret, and all three existing inline helpers do the same.
	if (ab.length !== bb.length) return false;

	// Feature-detect crypto.subtle.timingSafeEqual via a runtime shim cast.
	const subtle = crypto.subtle as unknown as {
		timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean;
	};
	if (typeof subtle.timingSafeEqual === "function") {
		try {
			return subtle.timingSafeEqual(ab, bb);
		} catch {
			// fall through to the XOR-loop fallback
		}
	}

	// Constant-time XOR-loop fallback. `?? 0` guards satisfy noUncheckedIndexedAccess.
	let d = 0;
	for (let i = 0; i < ab.length; i++) {
		d |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
	}
	return d === 0;
}
