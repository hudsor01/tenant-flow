// Shared constant-time string compare for Edge Functions.
//
// Structured after the resend-webhook pattern (resend-webhook/index.ts:145-168):
// a runtime feature detection for crypto.subtle.timingSafeEqual, with an
// XOR-loop beneath it.
//
// WHAT IS KNOWN ABOUT THOSE TWO BRANCHES, AND WHERE THE KNOWING STOPS.
//
// crypto.subtle.timingSafeEqual is a genuine non-standard extension, not a
// misreading: Deno documents it ("compares array buffers or data views in a way
// that isn't prone to timing based attacks ... likely some form of timing safe
// equality will make its way to the WebCrypto standard, see w3c/webcrypto#270,
// but until that time timingSafeEqual() is provided"), and Cloudflare's workerd
// implements the same extension. So the detection is detecting something real.
//
// CORRECTNESS DOES NOT DEPEND ON WHICH BRANCH RUNS. The platform primitive and
// the XOR loop below are both constant-time, which is why the detection is safe
// to leave exactly as it is and why nothing in this file needs to change.
//
// Which branch actually runs on Supabase's Deno has not been verified.
// Specifically unresolved from documentation: whether the GLOBAL crypto.subtle
// carries the extension, or whether only std/crypto's wrapper type (an
// interface that EXTENDS SubtleCrypto) does. Supabase Edge Functions use the
// global. Documentation pointed weakly both ways, so this comment recorded the
// question rather than picking an answer.
//
// MEASURED 2026-08-18 on Deno 2.9.5 (local, `deno eval`):
//   typeof crypto.subtle.timingSafeEqual === "undefined"
// So on that runtime the GLOBAL does NOT carry the extension -- only
// std/crypto's wrapper type does -- and the XOR loop below is what executes.
// That resolves the global-vs-wrapper question the documentation could not.
//
// STILL NOT VERIFIED ON THE DEPLOYMENT TARGET, which is the version that
// actually matters: Supabase Edge Runtime ships its own Deno build and was not
// the thing measured above. Do not upgrade this note to a claim about
// production. It is settled in one line against a deployed function -- log
// `typeof (crypto.subtle as unknown as Record<string, unknown>).timingSafeEqual`
// -- and the answer belongs back here once known. Tracked as deferred item D3;
// it was previously assigned to 66.1-05, which shipped without doing it, so the
// task existed only inside a comment nobody was accountable for.
//
// Either way nothing changes: both branches are constant-time, so this is a
// question about which code path executes, never about whether the compare is
// safe.
//
// IMPORTANT: this compares RAW secret strings directly (no HMAC). It is for
// callers that hold a shared secret and need a constant-time equality check —
// e.g. auth-email-send comparing the Authorization Bearer token against
// SUPABASE_AUTH_HOOK_SECRET. The other webhooks (resend/n8n) compare an
// HMAC digest against a computed digest; those keep their own HMAC machinery.
//
// CALLERS: auth-email-send, send-lease-reminders, and _shared/rate-limit.ts,
// which as of RATE-03 gates CLIENT_IP_FORWARD_SECRET through this function.
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

	// Feature-detect crypto.subtle.timingSafeEqual via a runtime shim cast. See
	// the file header for what is established about this branch and what is not.
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
