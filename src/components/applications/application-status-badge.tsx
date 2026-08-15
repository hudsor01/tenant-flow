/**
 * The status chip for one rental application (UI-SPEC §B-4).
 *
 * NOT A BARREL FILE. The one component below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * IT DECLARES NO CSS AND NO TOKENS, DELIBERATELY. `label` and `badgeVariant`
 * both come from `APPLICATION_STATUS` in `application-copy.ts`, so the queue
 * chip, the detail header and the action-bar copy read one map and cannot
 * disagree. Every variant that map names already carries its AA-safe `-text`
 * companion (`badge.tsx:22-26`), so a local `className` here would either
 * duplicate a token that already exists or reintroduce the vivid-on-text WCAG
 * failure the companions exist to prevent.
 *
 * TWO THINGS THAT LOOK LIKE MISTAKES AND ARE NOT. Both are recorded in
 * `application-copy.ts` too; they are repeated here because this is the file a
 * reviewer opens when the rendered chip surprises them.
 *
 *   UI-13 — the `rejected` status renders as `outline`, NOT as the red error
 *   variant. A declined applicant is not an error state, and red on a
 *   fair-housing-regulated surface reads as a judgment about the person rather
 *   than as a status. The plan's acceptance gate for this file is a
 *   zero-occurrence grep for that variant's name, which is why the name is
 *   spelled nowhere above — including in this prose (66-09 Pattern 1: a literal
 *   grep gate reads comments too).
 *
 *   UI-14 — the database value stays `rejected`, because D-07 locks the CHECK
 *   constraint, while the label an owner reads is "Declined". The mismatch is
 *   intentional in both directions: do not rename the column, and do not
 *   relabel the chip.
 */

import { Badge } from "#components/ui/badge";
import {
	APPLICATION_STATUS,
	type ApplicationStatus,
} from "#lib/applications/application-copy";

export function ApplicationStatusBadge({
	status,
}: {
	status: ApplicationStatus;
}) {
	const { label, badgeVariant } = APPLICATION_STATUS[status];
	return <Badge variant={badgeVariant}>{label}</Badge>;
}
