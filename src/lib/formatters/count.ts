/**
 * A count and its noun, in agreement: "1 day", "2 days", "0 days", "1.5
 * bathrooms". English takes the singular for exactly one and the plural for
 * every other number, a fraction or zero included.
 *
 * Every label that writes a number before its noun goes through these, so
 * "1 days" or "1 of 1 units" cannot be written: a hand-written `${n} days`
 * reads "1 days" for one (66.2-39, part R).
 */

/** The noun for `count`: `singular` for exactly 1, else `plural`. */
export function pluralNoun(
	count: number,
	singular: string,
	plural: string = `${singular}s`,
): string {
	return count === 1 ? singular : plural;
}

/** `count` and its noun: "1 day", "3 days". */
export function formatCount(
	count: number,
	singular: string,
	plural: string = `${singular}s`,
): string {
	return `${count} ${pluralNoun(count, singular, plural)}`;
}
