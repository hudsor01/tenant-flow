/**
 * The window R7 installs must never put another owner's applicant PII in range.
 *
 * WHY THIS RUNS OFF-NETWORK. `rental-applications-retention.test.ts` invokes a
 * global, destructive, irreversible sweep against production. The decision that
 * bounds its blast radius — which retention window to install — is the part that
 * can be WRONG, and it cannot be exercised safely by running the thing it
 * guards. So the decision is a pure function and this file is the place it is
 * proved, with no credentials, no network and no production rows.
 *
 * WHAT WENT WRONG, AND WHAT EACH ASSERTION CATCHES. R7 hardcoded a ONE-DAY
 * window and gated itself on "skip unless nothing foreign is in range at one
 * day". Then the E2E seeder was fixed to keep one `rental_applications` row
 * alive permanently — unconverted, un-anonymized, status `new`, so its clock
 * runs from `created_at` and it ages forever. One day after that row was first
 * seeded, a one-day window could never again be installed safely and R7 skipped
 * on every run, silently, while CI stayed green.
 *
 * The counter-example test below is the load-bearing one: it asserts the OLD
 * policy really would have put that row in range, which is what makes the new
 * plan's clearance mean something rather than merely pass.
 */

import { describe, expect, it } from "vitest";
import {
	FIXTURE_CLEARANCE_DAYS,
	FOREIGN_CLEARANCE_DAYS,
	planNarrowedWindow,
} from "../retention-window";

/** The migration default for `applications.retention_days`. */
const LIVE_WINDOW_DAYS = 730;

/**
 * A plausible age for the durable E2E seeder row — the row that made the old
 * guard permanently unsatisfiable. Any value above one day reproduces it.
 */
const SEEDER_ROW_AGE_DAYS = 30.4;

/** What R7 used to do, kept here so the differential can be measured. */
const OLD_HARDCODED_WINDOW_DAYS = 1;
const OLD_HARDCODED_FIXTURE_AGE_DAYS = 2;

/** A row is due when its sweep clock is older than the window. */
function isDue(ageDays: number, windowDays: number): boolean {
	return ageDays > windowDays;
}

describe("planNarrowedWindow — the durable seeder row", () => {
	it("installs a window that leaves the seeder row out of range while making the fixture due", () => {
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: SEEDER_ROW_AGE_DAYS,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});

		// It RUNS. The whole point: a plan that skips here is the bug restated.
		expect(plan.kind).toBe("run");
		if (plan.kind !== "run") return;

		// 1. THE BLAST RADIUS. The foreign row is not due at the installed window,
		//    with a clear day to spare. Broken state caught: any window at or below
		//    the seeder row's age, which is what the hardcoded 1 was.
		expect(isDue(SEEDER_ROW_AGE_DAYS, plan.windowDays)).toBe(false);
		expect(plan.windowDays).toBeGreaterThanOrEqual(
			SEEDER_ROW_AGE_DAYS + FOREIGN_CLEARANCE_DAYS,
		);

		// 2. THE TEST STILL TESTS SOMETHING. The fixture is due at the installed
		//    window. Broken state caught: a window widened so far to clear the
		//    foreign row that the suite's own row falls inside it too, which would
		//    make R7 pass by asserting nothing happened.
		expect(isDue(plan.fixtureAgeDays, plan.windowDays)).toBe(true);
		expect(plan.fixtureAgeDays).toBe(plan.windowDays + FIXTURE_CLEARANCE_DAYS);

		// 3. THE ASSERTION IS ATTRIBUTABLE TO THE NARROWING. The fixture is NOT due
		//    at the window that is live before the change, so an anonymized fixture
		//    can only be the narrowed window's doing. Broken state caught: the
		//    laundering where a fixture old enough to be swept anyway "proves" the
		//    config was read.
		expect(isDue(plan.fixtureAgeDays, LIVE_WINDOW_DAYS)).toBe(false);

		// 4. A window is a whole number of days, and never zero — a zero-day window
		//    makes EVERY row in the table due.
		expect(Number.isInteger(plan.windowDays)).toBe(true);
		expect(plan.windowDays).toBeGreaterThanOrEqual(1);
	});

	it("the old hardcoded window DID put that row in range — the differential", () => {
		// THE COUNTER-EXAMPLE. Without this, the assertion above is just a number
		// comparison that happens to hold. This states the defect directly: at the
		// window R7 shipped with, the foreign row is due, which is why the
		// fail-closed guard refused to run and R7 skipped forever.
		expect(isDue(SEEDER_ROW_AGE_DAYS, OLD_HARDCODED_WINDOW_DAYS)).toBe(true);
		// ...and the old fixture age was itself inside the seeder row's age, so no
		// amount of guard-tuning could have separated them.
		expect(OLD_HARDCODED_FIXTURE_AGE_DAYS).toBeLessThan(SEEDER_ROW_AGE_DAYS);

		const plan = planNarrowedWindow({
			oldestForeignAgeDays: SEEDER_ROW_AGE_DAYS,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});
		expect(plan.kind).toBe("run");
		if (plan.kind !== "run") return;
		expect(isDue(SEEDER_ROW_AGE_DAYS, plan.windowDays)).toBe(false);
	});
});

describe("planNarrowedWindow — the invariant over every foreign age", () => {
	// A spread that crosses every rounding boundary the implementation could get
	// wrong: sub-day, exactly one day, just over an integer, just under one, and
	// a row old enough that the window is most of the live one.
	const AGES = [0, 0.01, 0.9, 1, 1.0001, 29.4, 30, 364.9, 700, 726.9];

	it("never puts the foreign row in range, and never emits a zero-day window", () => {
		for (const age of AGES) {
			const plan = planNarrowedWindow({
				oldestForeignAgeDays: age,
				liveWindowDays: LIVE_WINDOW_DAYS,
			});
			if (plan.kind === "skip") {
				// A skip is allowed, but ONLY because no safe narrowing exists — never
				// because the arithmetic gave up. The boundary is asserted below.
				expect(
					age + FOREIGN_CLEARANCE_DAYS + FIXTURE_CLEARANCE_DAYS,
				).toBeGreaterThanOrEqual(LIVE_WINDOW_DAYS - 1);
				continue;
			}
			expect(isDue(age, plan.windowDays), `age ${age}`).toBe(false);
			expect(plan.windowDays, `age ${age}`).toBeGreaterThanOrEqual(1);
			expect(Number.isInteger(plan.windowDays), `age ${age}`).toBe(true);
			expect(isDue(plan.fixtureAgeDays, plan.windowDays), `age ${age}`).toBe(
				true,
			);
			expect(isDue(plan.fixtureAgeDays, LIVE_WINDOW_DAYS), `age ${age}`).toBe(
				false,
			);
		}
	});

	it("still refuses a zero-day window when the table holds no foreign row at all", () => {
		// `null` is the tempting case to special-case into "narrow as far as you
		// like". It must not: a 0-day window would make every row in the table due,
		// and a row inserted by anyone else while the test runs would land in it.
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: null,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});
		expect(plan.kind).toBe("run");
		if (plan.kind !== "run") return;
		expect(plan.windowDays).toBeGreaterThanOrEqual(1);
		expect(isDue(0, plan.windowDays)).toBe(false);
	});

	it("treats a future-clocked row as age zero rather than letting it shrink the window", () => {
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: -5,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});
		expect(plan.kind).toBe("run");
		if (plan.kind !== "run") return;
		expect(plan.windowDays).toBeGreaterThanOrEqual(1);
	});
});

describe("planNarrowedWindow — when there is no safe run, it says so", () => {
	it("skips rather than sweeping a foreign row older than the live window", () => {
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: 900,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});

		// The unsafe alternative — widening past 730 to clear the 900-day row —
		// would install a window under which real applicant PII is due. Refusing is
		// the correct answer, and the reason names both numbers so the skip is
		// diagnosable from a CI log rather than merely quiet.
		expect(plan.kind).toBe("skip");
		if (plan.kind !== "skip") return;
		expect(plan.reason).toContain("900");
		expect(plan.reason).toContain("730");
	});

	it("skips at the boundary where the fixture would be due under the live window anyway", () => {
		// Age chosen so the window clears the foreign row but the fixture lands
		// exactly ON the live window. Running would anonymize the fixture with or
		// without the narrowing, and R7 would pass while proving nothing — the
		// green-but-proves-nothing shape, refused rather than shipped.
		const age =
			LIVE_WINDOW_DAYS - FOREIGN_CLEARANCE_DAYS - FIXTURE_CLEARANCE_DAYS;
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: age,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});
		expect(plan.kind).toBe("skip");
	});

	it("skips when the live window is unreadable, rather than defaulting to something narrow", () => {
		for (const liveWindowDays of [
			Number.NaN,
			0,
			-1,
			Number.POSITIVE_INFINITY,
		]) {
			const plan = planNarrowedWindow({
				oldestForeignAgeDays: 1,
				liveWindowDays,
			});
			expect(plan.kind, `liveWindowDays ${String(liveWindowDays)}`).toBe(
				"skip",
			);
		}
	});

	it("skips when the oldest foreign age could not be read", () => {
		// Fail CLOSED. An unknown blast radius is treated as an unsafe one, never
		// as an empty one.
		const plan = planNarrowedWindow({
			oldestForeignAgeDays: Number.NaN,
			liveWindowDays: LIVE_WINDOW_DAYS,
		});
		expect(plan.kind).toBe("skip");
	});
});
