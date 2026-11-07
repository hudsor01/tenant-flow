// A hand-rolled fake SupabaseClient for the in-process Deno tests.
//
// Each test's fake implements only the members its handler calls (`from` and
// `rpc`, plus `auth` or `storage` where the handler calls it), so it is not
// structurally a SupabaseClient.
// `fakeSupabaseClient` checks the two members every handler reaches for and
// narrows through a type guard, which is how a fake stands in for the client
// without a double assertion (CLAUDE.md Zero Tolerance Rule 8).

import type { SupabaseClient } from "@supabase/supabase-js";

function isSupabaseClientLike(value: object): value is SupabaseClient {
	return (
		"from" in value &&
		typeof value.from === "function" &&
		"rpc" in value &&
		typeof value.rpc === "function"
	);
}

export function fakeSupabaseClient(fake: object): SupabaseClient {
	if (!isSupabaseClientLike(fake)) {
		throw new Error("a fake SupabaseClient needs from() and rpc()");
	}
	return fake;
}
