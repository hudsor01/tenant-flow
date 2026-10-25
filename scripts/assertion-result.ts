/**
 * The shape every CI assertion in `scripts/` returns, and the one piece of
 * GitHub-annotation formatting its callers share.
 *
 * Shared so the two gates built on it -- the migration-replay comparisons and
 * the platform-config drift checks -- cannot define two near-identical result
 * types (CLAUDE.md zero-tolerance rule 3).
 */

export interface AssertionResult {
	readonly ok: boolean;
	/**
	 * One line on success. On failure this becomes the body of a GitHub
	 * `::error::` annotation, which is the only thing most readers will see --
	 * so it has to say what to do about the failure, not just what differed.
	 */
	readonly message: string;
}

/**
 * A workflow-command error annotation.
 *
 * The newline escape is required: GitHub keeps only the first line of an
 * unescaped multi-line annotation body, and in these messages the first line is
 * usually the least useful one.
 */
export function errorAnnotation(message: string): string {
	return `::error::${message.replaceAll("\n", "%0A")}`;
}

/**
 * A workflow-command warning annotation, for an invariant that could not be
 * checked at all.
 *
 * Reported rather than counted as a pass, on purpose: an assertion that quietly
 * does not run is the failure mode this whole family of gates exists to
 * prevent.
 */
export function warningAnnotation(message: string): string {
	return `::warning::${message.replaceAll("\n", "%0A")}`;
}
