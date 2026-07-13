import { parseLocalYmd } from "#lib/formatters/date";

/**
 * Validate a move-out date picked from an `<input type="date">` (YYYY-MM-DD).
 * Throws on empty, malformed, or past dates.
 *
 * The picker value is a date-only string; parsing it with `new Date(value)`
 * yields UTC midnight, which compares as "yesterday" against a local-midnight
 * `today` for every user west of UTC — rejecting today's date (COMP-08).
 * `parseLocalYmd` builds a local-midnight Date so both sides share one frame.
 */
export function validateMoveOutDate(dateString: string): void {
	if (!dateString) {
		throw new Error("Move out date is required");
	}

	const date = parseLocalYmd(dateString);
	if (!date) {
		throw new Error("Invalid date format");
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (date < today) {
		throw new Error("Move out date cannot be in the past");
	}
}
