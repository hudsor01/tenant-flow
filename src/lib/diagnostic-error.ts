/**
 * An error whose message is a diagnostic for Sentry and the logs, never copy
 * for a user: a boundary mapper's shape check, an RPC that returned the wrong
 * shape, an invariant the code relies on. `userFacingErrorMessage` shows the
 * caller's fallback copy for it, so its text never reaches a toast or the
 * screen (66.2-39 fix round 4, Part 5d: a malformed category row toasted
 * "mapDocumentCategoryRow: NOT NULL field 'slug' missing or non-string from
 * PostgREST response").
 *
 * Throw it wherever the message names code (a function, a field, an RPC, an
 * id) rather than telling the user what to do; throw a plain `Error` only for
 * copy written for the user.
 */
export class DiagnosticError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DiagnosticError";
	}
}
