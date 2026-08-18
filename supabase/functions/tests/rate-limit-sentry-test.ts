// RATE-04 — proof that `_shared/errors.ts` BINDS a Sentry client.
//
// WHY BOUNDNESS IS THE ACCEPTANCE CRITERION, AND "captureException was called"
// IS NOT. `Sentry.captureException` returns an event id whether or not a client
// exists. That is exactly why the defect survived: seventeen edge functions call
// it through `_shared/errors.ts`, `Sentry.init` ran in only one of them
// (stripe-webhooks/index.ts), and every call in the other sixteen handed its
// event to a client that had never been constructed. Any assertion of the form
// "the capture happened" passes identically before and after the fix. So this
// file asserts on `Sentry.getClient()`.
//
// THIS TEST FAILS AGAINST THE CODE AS IT STOOD BEFORE 66.1-03. That is what
// makes it non-vacuous.
//
// RUN:
//   deno test --allow-all --no-check \
//     --import-map=supabase/functions/deno.json \
//     supabase/functions/tests/rate-limit-sentry-test.ts
//
// THIS FILE DOES NOT RUN IN CI. Verified, not assumed: nothing in
// `package.json` scripts, `lefthook.yml`, or `.github/workflows/` invokes
// `deno test`, so every file in `supabase/functions/tests/` is local-only today.
// Adding a Deno CI job is out of scope for this plan. It is stated here rather
// than hidden, and this file carries NO conditional guard of any kind — Phase 66
// shipped a test whose own guard the accompanying fix made permanently true, so
// the suite stayed green while covering nothing. A second one is not acceptable.
//
// WHAT THIS FILE DOES NOT PROVE: that an event reaches Sentry's servers. That
// needs a real DSN, network egress from a deployed isolate, and a look at the
// Sentry project. It is 66.1-05's live check, with `SENTRY_DSN` set as a
// Supabase function secret as its stated precondition. Envelope-level proof
// (`client.on("beforeEnvelope", ...)`) is likewise deferred there.
//
// ORDER IS LOAD-BEARING. `@sentry/deno` keeps the client on a process-global
// carrier, so once a client is bound it stays bound for the rest of this
// process. The unset-DSN case therefore runs FIRST, against a genuinely
// unbound global. Reordering these two cases makes the first one vacuous.

import { assert, assertEquals } from "jsr:@std/assert@1";
import * as Sentry from "@sentry/deno";

// A syntactically valid DSN pointing at a non-routable local port: nothing
// leaves this machine, and any transport attempt fails immediately on
// connection refused.
const PROBE_DSN = "https://0123456789abcdef0123456789abcdef@127.0.0.1:9/1";

Deno.test({
	name: "errors.ts: SENTRY_DSN unset -> no client bound, and nothing throws",
	// Sanitizers are disabled for the SDK's own background transport machinery,
	// which is not what this file asserts on. No assertion is relaxed by this.
	sanitizeOps: false,
	sanitizeResources: false,
	async fn() {
		Deno.env.delete("SENTRY_DSN");

		// Fresh module instance: the binding latch in errors.ts is module-level
		// state, and a query string makes Deno treat this as a distinct module.
		const { captureWebhookError } = await import(
			"../_shared/errors.ts?probe=unset"
		);

		// An edge function must never 500 because monitoring is unconfigured.
		captureWebhookError(new Error("probe-unset"), {
			event: "rate_limit_error",
			error_class: "db_unreachable",
		});

		assertEquals(
			Sentry.getClient(),
			undefined,
			"no DSN must leave the client unbound rather than binding a broken one",
		);
	},
});

Deno.test({
	name: "errors.ts: SENTRY_DSN set -> a client is BOUND on the first capture",
	sanitizeOps: false,
	sanitizeResources: false,
	async fn() {
		Deno.env.set("SENTRY_DSN", PROBE_DSN);

		const { captureWebhookError } = await import(
			"../_shared/errors.ts?probe=set"
		);

		captureWebhookError(new Error("probe-set"), {
			event: "rate_limit_error",
			error_class: "db_unreachable",
		});

		const client = Sentry.getClient();
		try {
			assert(
				client,
				"first capture must bind a Sentry client — before 66.1-03 this was undefined, which is why every rate_limit_error in sixteen functions went nowhere",
			);
			assertEquals(
				client?.getOptions().dsn,
				PROBE_DSN,
				"the bound client must carry the DSN this isolate was configured with",
			);
		} finally {
			// UNBIND, AND NOT AS TIDINESS -- THIS TEST CORRUPTS ITS SIBLINGS WITHOUT IT.
			//
			// Sentry.getClient() is ISOLATE-global, not per-module: the ?probe= query
			// string gives this file a fresh copy of errors.ts, but the client it binds
			// is shared with every other test file `deno test` loads into the same
			// isolate.
			//
			// A bound client TRANSMITS OVER globalThis.fetch. Sibling suites stub fetch
			// and assert on the call count -- withResendStub's fetchCount() in
			// send-lease-reminders-test.ts, and the same pattern in lease-signing-test.ts.
			// Leaving a client bound made Sentry's own transport land in those counters,
			// so a batch expecting fetchCount() === 2 saw 3 and failed. Measured: both
			// files pass alone (25 and 12), and both fail when this file runs first.
			//
			// The failure is also NOT self-evident from the diff -- it appears in files
			// this plan never touched, which is precisely how it survived local runs of
			// this file on its own.
			await Sentry.close(0);
			Sentry.getCurrentScope().setClient(undefined);
			Deno.env.delete("SENTRY_DSN");
		}
	},
});
