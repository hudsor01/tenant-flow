/**
 * Choosing a retention window that R7 can install WITHOUT putting anyone else's
 * applicant PII in the sweep's range.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROBLEM THIS SOLVES.
 *
 * `anonymize_old_rental_applications()` is GLOBAL, DESTRUCTIVE and IRREVERSIBLE:
 * it clears twenty-nine PII columns on every row in the table whose
 * `coalesce(decided_at, created_at)` is older than `applications.retention_days`
 * — every owner's rows, not just the calling suite's. R7 exists to prove that
 * function reads the configured window at all, which requires narrowing the
 * window and invoking the real sweep against production.
 *
 * The original R7 narrowed to a HARDCODED one day. A one-day window makes very
 * nearly every application in the database due, so the test was gated on a
 * fail-closed guard — "skip unless no foreign row is in range at one day" — and
 * that guard is correct and must stay. What broke is that the guard became
 * permanently unsatisfiable: the E2E seeder now deliberately keeps one
 * `rental_applications` row alive forever (it bounds an un-resettable
 * `submission_count`), that row is unconverted and un-anonymized for 730 days,
 * and one day after it is seeded nothing narrower than its own age can ever be
 * installed safely. R7 skipped forever, silently.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT ACTUALLY DISTINGUISHES "SAFE TO AGE" FROM "SOMEONE ELSE'S DATA".
 *
 * Not ownership, and not a label on the row: the sweep does not read either, so
 * neither can bound what it touches. The ONLY thing that bounds a global sweep
 * is the WINDOW ITSELF. A row is out of range precisely when its sweep clock is
 * younger than the window, so the question is not "which rows may we age?" but
 * "which window puts none of theirs in range while still putting ours there?"
 *
 * That window is computable. Take the age of the OLDEST still-sweepable row
 * that is not the suite's own, add a clearance day, and round up: every foreign
 * row is then strictly younger than the window and none is due. Then age the
 * suite's own fixture PAST that window, but keep it INSIDE the window that is
 * live right now — so the sweep leaves it alone before the narrowing and clears
 * it after, which is the difference the test is actually claiming.
 *
 * When no such window exists — a foreign row so old that clearing it would push
 * the fixture past the live window too — there is no safe run, and this returns
 * a skip carrying the reason. A loud, correct skip beats an unsafe run.
 *
 * NOTHING HERE REPLACES THE GUARD. The window this computes is a window the
 * guard should ACCEPT; the caller still re-checks the real table at that exact
 * window immediately before installing it, and still refuses to run if anything
 * foreign is in range.
 *
 * Pure and network-free on purpose: this is the part that can be wrong, and it
 * is unit-tested off-network in `__tests__/retention-window.test.ts`.
 */

/**
 * Days of clearance between the oldest foreign row and the installed window.
 *
 * Absorbs clock skew between this process and the database, and the seconds
 * between reading the ages and the sweep actually running. Rows only ever age
 * FORWARD, and a row inserted while the test runs starts at age ~0, so a whole
 * day of clearance is generous for both.
 */
export const FOREIGN_CLEARANCE_DAYS = 1;

/**
 * Days by which the suite's own fixture is aged PAST the installed window, so
 * it is unambiguously due there rather than sitting on the boundary.
 */
export const FIXTURE_CLEARANCE_DAYS = 2;

export type NarrowedWindowPlan =
	| {
			kind: "run";
			/** The value to write to `applications.retention_days`. */
			windowDays: number;
			/** How old to make the fixture row's `coalesce(decided_at, created_at)`. */
			fixtureAgeDays: number;
	  }
	| { kind: "skip"; reason: string };

export interface NarrowedWindowInput {
	/**
	 * Age in days of the oldest row that is still sweepable (un-anonymized and
	 * unconverted) and is NOT one of the suite's own fixtures. `null` when there
	 * is no such row at all.
	 */
	oldestForeignAgeDays: number | null;
	/** The retention window that is live right now, in days. */
	liveWindowDays: number;
}

export function planNarrowedWindow(
	input: NarrowedWindowInput,
): NarrowedWindowPlan {
	const { oldestForeignAgeDays, liveWindowDays } = input;

	if (!Number.isFinite(liveWindowDays) || liveWindowDays <= 0) {
		return {
			kind: "skip",
			reason: `the live retention window is not a positive number of days (${String(liveWindowDays)}), so there is nothing to narrow from`,
		};
	}
	if (oldestForeignAgeDays !== null && !Number.isFinite(oldestForeignAgeDays)) {
		return {
			kind: "skip",
			reason:
				"the oldest foreign row's age could not be read, so the blast radius is unknown",
		};
	}

	// A negative age means a row clocked in the future. Treated as 0 rather than
	// allowed to pull the window down: it must not be able to shrink the window
	// below what the present-day rows need.
	const foreignAge =
		oldestForeignAgeDays === null ? 0 : Math.max(oldestForeignAgeDays, 0);

	// `ceil` and not `round`: the window must land STRICTLY above the oldest
	// foreign age, and `Math.max(…, 1)` is the floor that matters most — a
	// zero-day window would make every row in the table due, which is the exact
	// opposite of what this function exists to guarantee.
	const windowDays = Math.max(
		1,
		Math.ceil(foreignAge + FOREIGN_CLEARANCE_DAYS),
	);
	const fixtureAgeDays = windowDays + FIXTURE_CLEARANCE_DAYS;

	if (fixtureAgeDays >= liveWindowDays) {
		return {
			kind: "skip",
			reason:
				`no window is both safe and narrowing: clearing the oldest foreign row ` +
				`(${foreignAge.toFixed(1)}d) needs a ${windowDays}d window, whose fixture ` +
				`would have to be ${fixtureAgeDays}d old — already due under the live ` +
				`${liveWindowDays}d window, so a pass would prove nothing about the narrowing`,
		};
	}

	return { kind: "run", windowDays, fixtureAgeDays };
}
