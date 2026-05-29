/**
 * Boundary mappers for PostgREST RPC returns whose generated TS type is
 * `Json` (or `unknown` for legacy helpers that haven't been retyped).
 *
 * The Supabase code generator emits `Returns: Json` for any RPC that returns
 * `jsonb`. The `Json` type is a recursive union (primitives + arrays +
 * objects) that doesn't structurally overlap with our app-side interfaces,
 * so a direct `data as MyType` cast trips the TS structural-overlap check.
 *
 * CLAUDE.md Rule #8 forbids `as unknown as` for this case. These helpers
 * are the canonical replacement -- each runs a real runtime check
 * (object-vs-array-vs-primitive) at the RPC boundary and only narrows the
 * type AFTER verifying the shape. The cast is sound because the runtime
 * guard rejects mismatched shapes loudly instead of pretending compatibility.
 *
 * Use one of these at every `await supabase.rpc(...)` site that asserts a
 * structured return type. Throw early so the caller sees a useful error
 * instead of cascading undefined-field reads downstream.
 */

export function jsonObject<T extends object>(data: unknown): T {
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		throw new Error(
			"Expected JSON object from RPC return; got " +
				(data === null ? "null" : Array.isArray(data) ? "array" : typeof data),
		);
	}
	return data as T;
}

export function jsonArray<T>(data: unknown): T[] {
	if (!Array.isArray(data)) {
		throw new Error(
			"Expected JSON array from RPC return; got " +
				(data === null ? "null" : typeof data),
		);
	}
	return data as T[];
}

/**
 * Lenient variant that returns an empty default when the RPC returns null
 * or undefined. Use for analytics-style endpoints where "no data yet" is a
 * valid state the consumer should render as an empty dashboard, not throw.
 */
export function jsonObjectOrEmpty<T extends object>(
	data: unknown,
	fallback: T,
): T {
	if (data === null || data === undefined) return fallback;
	return jsonObject<T>(data);
}

export function jsonArrayOrEmpty<T>(data: unknown): T[] {
	if (data === null || data === undefined) return [];
	return jsonArray<T>(data);
}
