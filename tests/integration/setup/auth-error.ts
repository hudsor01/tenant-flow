/**
 * Render a Supabase AuthError with the fields that actually distinguish
 * failure modes. `status` (HTTP) and `code` (GoTrue's error_code, e.g.
 * invalid_credentials, over_request_rate_limit) are what tell a wrong password
 * from a rate limit from a network failure; `.message` alone cannot -- a
 * production run once failed with the message rendered as "<none>" and nothing
 * else, which was unclassifiable after the fact.
 *
 * Lives in its own module ON PURPOSE: supabase-client.ts asserts env vars at
 * import time, so a pure formatter must not be imported from there or every
 * importer inherits that load-time throw and loses its own clearer message.
 *
 * Supabase types these as `number | undefined` / `string | undefined`, not
 * optional keys, so under exactOptionalPropertyTypes the parameter must say so.
 */
export function describeAuthError(error: {
	name?: string | undefined;
	status?: number | undefined;
	code?: string | undefined;
	message: string;
}): string {
	const parts = [
		error.name ?? "AuthError",
		error.status !== undefined ? `HTTP ${error.status}` : null,
		error.code ? `code=${error.code}` : null,
		error.message || "(empty message)",
	];
	return parts.filter((p): p is string => p !== null).join(" | ");
}
