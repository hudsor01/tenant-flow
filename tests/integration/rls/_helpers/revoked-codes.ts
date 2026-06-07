/**
 * Shared SQLSTATE/PostgREST error-code sets for RLS integration tests.
 *
 * Single source of truth so the duplicated code-list literals across the
 * suite cannot drift apart (TEST-04). Import the named set directly — do
 * NOT add a barrel/re-export index (zero-tolerance rule #2).
 */

/**
 * EXECUTE-revoke set: PostgREST surfaces a revoked EXECUTE on a SECURITY
 * DEFINER function as `42501` (insufficient_privilege) in current versions;
 * older variants returned `42883` (undefined_function) or `PGRST202`
 * (function not found via the PostgREST schema cache). Accept any of the
 * three so a test pins "function is unreachable from this role", not a
 * specific code string.
 *
 * Consumed by: anon-rpc-grants, funnel-admin-rpc, admin-rpc-grants,
 * users-privileged-columns.
 */
export const REVOKED_CODES: readonly string[] = ["42501", "42883", "PGRST202"];

/**
 * RLS row-deny / missing-table-grant set: PostgREST surfaces a missing table
 * grant or an RLS row-level denial as `42501` (insufficient_privilege),
 * `PGRST301` / `PGRST302` (JWT / authorization failures), or `PGRST116`
 * (no rows / not found). This is a DIFFERENT set from REVOKED_CODES — it
 * covers table-level row-deny, not function EXECUTE-revoke.
 *
 * Consumed by: rls-no-policy-lockdown.
 */
export const DENIED_CODES: readonly string[] = [
	"42501",
	"PGRST301",
	"PGRST302",
	"PGRST116",
];
