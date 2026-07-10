const MAX_SEARCH_LENGTH = 100;

/**
 * Normalize user search input for a discrete PostgREST filter param.
 *
 * Value characters are NOT stripped: postgrest-js sends the value in a
 * discrete parameter for `.ilike(col, `%${s}%`)` calls, so dots, `@`, commas
 * and quotes are treated as literal text by PostgREST — stripping them
 * corrupted legitimate email/dotted searches (e.g. "jane.doe@acme.com").
 *
 * Only trims surrounding whitespace and caps length.
 */
export function normalizeSearchInput(input: string): string {
	return input.trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Escape a search value for interpolation into a raw PostgREST `.or()` logic
 * string. Unlike a discrete `.ilike()` param, the `.or()` string is parsed by
 * PostgREST — `, . ( ) :` are structural. To keep the value literal, callers
 * MUST wrap it in double quotes at the call site:
 *
 *   q.or(`name.ilike."%${escapeOrValue(s)}%",city.ilike."%${escapeOrValue(s)}%"`)
 *
 * Inside those double quotes only `\` and `"` are special, so this escapes the
 * backslash FIRST (so an already-escaping backslash isn't double-counted) then
 * the double quote. Value chars like `. , ( ) :` are left intact and become
 * literal text once quote-wrapped.
 */
export function escapeOrValue(input: string): string {
	return normalizeSearchInput(input)
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"');
}
