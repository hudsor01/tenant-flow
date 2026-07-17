/**
 * Intersect a selection Set with the ids currently present in a fetched list.
 *
 * Used as the mutation-time guard for bulk actions (STATE-05 / STATE-12): a
 * bulk edit/delete must only target ids that are still listed, so a stale or
 * soft-deleted id surviving the delete→refetch race can never be re-targeted
 * (e.g. a bulk edit resurrecting a just-deleted property).
 */
export function intersectSelection(
	selected: Iterable<string>,
	validIds: readonly string[],
): string[] {
	const valid = new Set(validIds);
	return Array.from(selected).filter((id) => valid.has(id));
}
