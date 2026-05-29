/**
 * Strip `undefined` values from an object before passing to a Supabase
 * insert/update call.
 *
 * Why: TanStack Form / Zod-derived payloads expose optional fields as
 * `string | undefined`, but Supabase's generated insert types (under
 * `exactOptionalPropertyTypes: true`) expect `string | null` or the field
 * omitted entirely. Omitting `undefined` keys lets Postgres apply each
 * column's DEFAULT for absent fields and avoids the false-positive type
 * error that the form/DB nullability mismatch creates.
 *
 * Return-type soundness: the loop filters out every undefined-valued
 * entry, so the resulting `Record<string, unknown>` only contains keys
 * whose runtime values are non-undefined. `StripUndefined<T>` is exactly
 * the structural shape of those remaining keys (each `T[K]` minus
 * `undefined`), so the final single-step cast from `Record<string,
 * unknown>` to `StripUndefined<T>` is a sound widening, not a `as unknown
 * as` bridge.
 */
type StripUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

export function omitUndefined<T>(obj: T): StripUndefined<T> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		if (value !== undefined) result[key] = value;
	}
	return result as StripUndefined<T>;
}
