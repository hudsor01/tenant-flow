/**
 * Strip `undefined` values from an object before passing to a Supabase
 * insert/update call.
 *
 * Why: TanStack Form / Zod-derived payloads expose optional fields as
 * `string | undefined`, but Supabase's generated insert types (under
 * `exactOptionalPropertyTypes: true`) expect `string | null` or the field
 * omitted entirely. Omitting `undefined` keys lets Postgres apply each
 * column's DEFAULT for absent fields and avoids the false-positive
 * type error that the form/DB nullability mismatch creates.
 *
 * The return type preserves T's nullability: required fields stay
 * required (callers must supply them as non-undefined), optional fields
 * that were undefined drop out cleanly. The cast through `unknown` is
 * required because a structural transformation that conditionally drops
 * keys can't be expressed in TS's value-space; the type contract is
 * "same shape as input minus undefined-valued optional keys", which is
 * sound because non-undefined values are passed through unchanged.
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
