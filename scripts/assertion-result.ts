/**
 * The shape every CI assertion in `scripts/` returns, and the one piece of
 * GitHub-annotation formatting its callers share.
 *
 * Shared so the two gates built on it -- the migration-replay comparisons and
 * the platform-config drift checks -- cannot define two near-identical result
 * types (CLAUDE.md zero-tolerance rule 3).
 */

export interface AssertionResult {
	/** False only when the invariant was checked and does NOT hold. */
	readonly ok: boolean;
	/**
	 * True when nothing was proven either way -- the signal this assertion reads
	 * was unavailable, or is too weak to establish the invariant.
	 *
	 * A THIRD STATE, because the two-state version is how a gate comes to report
	 * silence as success. An unverified result is annotated as a warning and
	 * left OUT of the pass count rather than added to it, so a run that proved
	 * five things out of six says so.
	 */
	readonly unverified?: boolean;
	/**
	 * One line on success. On a failure or an unverified result this becomes the
	 * body of a GitHub annotation, which is the only thing most readers will see
	 * -- so it has to say what to do about it, not just what differed.
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
