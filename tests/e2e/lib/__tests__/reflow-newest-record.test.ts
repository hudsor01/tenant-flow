/**
 * `owner-reflow-320.spec.ts` measures each detail and edit page on owner A's
 * newest record of its kind. The lookup's `error` was dropped: any failed
 * query stored no id and the kind's pages skipped with "owner A has no
 * <kind>" (66.2-39 fix round 3, cycle 2, F90), so a network error, a 5xx or a
 * renamed column read as missing data. `newestRecord` keeps the two apart: no
 * record skips with that reason, a failed query fails with its error.
 */
import { describe, expect, it } from "vitest";
import { newestRecord } from "../reflow";

describe("newestRecord", () => {
	it("returns the newest record's id: the first row of the created_at-descending lookup", () => {
		// Two rows, so reading any row but the first fails.
		expect(
			newestRecord("lease", {
				data: [{ id: "lease-newest" }, { id: "lease-older" }],
				error: null,
			}),
		).toEqual({ state: "found", id: "lease-newest" });
	});

	it("says owner A has no record only when the query returned none", () => {
		expect(newestRecord("lease", { data: [], error: null })).toEqual({
			state: "none",
			reason: "owner A has no lease",
		});
	});

	it("fails with the error when the query failed", () => {
		expect(
			newestRecord("maintenance request", {
				data: null,
				error: {
					message: "column maintenance_requests.created_at does not exist",
				},
			}),
		).toEqual({
			state: "failed",
			reason:
				"owner A's newest maintenance request could not be read: column maintenance_requests.created_at does not exist",
		});
	});

	it("fails when the response is not a rows array or the row has no id", () => {
		expect(newestRecord("unit", { data: null, error: null })).toMatchObject({
			state: "failed",
		});
		expect(
			newestRecord("unit", { data: [{ id: 7 }], error: null }),
		).toMatchObject({ state: "failed" });
	});
});
