/**
 * The shape every CI assertion in `scripts/` returns, and the one piece of
 * GitHub-annotation formatting its callers share.
 *
 * Shared so the gates built on it -- the migration-replay comparisons, the
 * platform-config drift checks and the workflow contract -- cannot define three
 * near-identical result types (CLAUDE.md zero-tolerance rule 3).
 */

/**
 * THREE STATES, AND THE UNION IS WHAT KEEPS THEM EXCLUSIVE.
 *
 * A two-state result is how a gate comes to report silence as success, which is
 * the failure this whole family of gates exists to prevent -- so `unverified`
 * says "nothing was proven either way": the signal was unavailable, or is too
 * weak to establish the invariant. It is annotated as a warning and left OUT of
 * the pass count rather than added to it, so a run that proved five things out
 * of six says so.
 *
 * It is a union rather than an interface with an optional flag because the
 * combination `{ ok: false, unverified: true }` has no meaning and a CLI that
 * checked the flag first would annotate a real failure as a warning and exit 0.
 * Making it unrepresentable is cheaper than remembering the order.
 */
export type AssertionResult =
	| {
			readonly ok: true;
			/** True when nothing was proven either way. */
			readonly unverified?: boolean;
			readonly message: string;
	  }
	| {
			readonly ok: false;
			/**
			 * One line on success. On a failure or an unverified result this is the
			 * body of a GitHub annotation, which is the only thing most readers will
			 * see -- so it has to say what to do about it, not just what differed.
			 */
			readonly message: string;
	  };

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

/** The same, for an invariant that could not be checked at all. */
export function warningAnnotation(message: string): string {
	return `::warning::${message.replaceAll("\n", "%0A")}`;
}

/**
 * Print one result the way every CLI here prints it, and say whether it failed.
 *
 * Shared so no caller can test `unverified` before `ok` and turn a failure into
 * a warning, which is exactly the mistake the union above makes
 * unrepresentable in the type but not in the control flow.
 */
export function reportResult(title: string, result: AssertionResult): boolean {
	if (!result.ok) {
		console.log(errorAnnotation(`${title}\n${result.message}`));
		console.log(`FAIL  ${title}: ${result.message}`);
		return true;
	}
	if (result.unverified === true) {
		console.log(warningAnnotation(`UNVERIFIED  ${title}\n${result.message}`));
		console.log(`UNVERIFIED  ${title}: ${result.message}`);
		return false;
	}
	console.log(`PASS  ${title}: ${result.message}`);
	return false;
}
