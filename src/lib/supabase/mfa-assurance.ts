/**
 * SEC-01 — Shared MFA step-up predicate.
 *
 * `MfaAssurance` is a structural subset of the supabase-js
 * `getAuthenticatorAssuranceLevel()` `data` shape (`currentLevel` +
 * `nextLevel`), so the middleware can assign that `data` here without an
 * `any` cast. This module imports no Supabase client — it is a pure leaf
 * module so both `proxy.ts` (Edge runtime) and the login client component
 * can import it, and so the predicate is trivially unit-testable as one
 * source of truth.
 */
export type MfaAssurance = {
	currentLevel: string | null;
	nextLevel: string | null;
};

/**
 * True when a session must complete MFA step-up before reaching a private
 * route: the user has a verified factor (`nextLevel === "aal2"`) but the
 * current session has NOT stepped up (`currentLevel !== "aal2"`).
 *
 * Keys on `nextLevel` (not the raw JWT `aal` claim) so a no-MFA aal1 user
 * (`nextLevel === "aal1"`) is NOT locked out. `null` / `undefined` → false.
 */
export function requiresMfaStepUp(assurance: MfaAssurance | null): boolean {
	return assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2";
}
