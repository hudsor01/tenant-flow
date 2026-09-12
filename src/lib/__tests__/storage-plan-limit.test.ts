import { describe, expect, it } from "vitest";
import {
	isStoragePlanLimitError,
	STORAGE_PLAN_LIMIT_PREFIX,
	wouldExceedStorageQuota,
} from "#lib/storage-plan-limit";

const GB = 1024 ** 3;

// THE CASE THAT WAS MISSING, AND IT IS THE ONLY SHAPE PRODUCTION EMITS ON THE
// UPLOAD PATH. Every existing case here fabricates an error carrying the
// `plan_limit_exceeded:` prefix. A real blocked upload returns
// `database error, code: PLIM1` with message, hint and detail stripped by the
// Storage API — so the suite was green against a shape that never occurs there.
describe("storage plan-limit detection on the upload path", () => {
	it("detects a Storage API rejection, which carries only the SQLSTATE", () => {
		expect(
			isStoragePlanLimitError({ message: "database error, code: PLIM1" }),
		).toBe(true);
	});

	it("detects a PostgREST rejection, which carries the code field", () => {
		expect(
			isStoragePlanLimitError({ code: "PLIM1", message: "anything" }),
		).toBe(true);
	});

	it("does NOT treat an unrelated trigger exception as a quota block", () => {
		expect(
			isStoragePlanLimitError({ message: "database error, code: P0001" }),
		).toBe(false);
		expect(isStoragePlanLimitError({ code: "P0001" })).toBe(false);
	});
});

describe("STORAGE_PLAN_LIMIT_PREFIX", () => {
	it("is the literal Plan 04 trigger contract prefix", () => {
		expect(STORAGE_PLAN_LIMIT_PREFIX).toBe("plan_limit_exceeded:");
	});
});

describe("isStoragePlanLimitError — message-prefix detector", () => {
	it("returns true for a StorageApiError-shaped object whose message begins with the prefix", () => {
		const err = {
			name: "StorageApiError",
			message:
				"plan_limit_exceeded: storage quota reached (11811160064 / 10737418240 bytes used)",
			status: 400,
			statusCode: "400",
		};
		expect(isStoragePlanLimitError(err)).toBe(true);
	});

	it("returns true for a real Error instance carrying the prefix", () => {
		expect(
			isStoragePlanLimitError(
				new Error(
					"plan_limit_exceeded: storage quota reached (11 / 10 bytes used)",
				),
			),
		).toBe(true);
	});

	it("returns false for an unrelated error message", () => {
		expect(isStoragePlanLimitError({ message: "some other error" })).toBe(
			false,
		);
	});

	it("returns false when the prefix is present but not at the start", () => {
		expect(
			isStoragePlanLimitError({
				message: "network: plan_limit_exceeded: nope",
			}),
		).toBe(false);
	});

	it("returns false for null / undefined / a bare string (guarded, no throw)", () => {
		expect(isStoragePlanLimitError(null)).toBe(false);
		expect(isStoragePlanLimitError(undefined)).toBe(false);
		expect(isStoragePlanLimitError("plan_limit_exceeded: as a string")).toBe(
			false,
		);
	});

	it("returns false when message is not a string", () => {
		expect(isStoragePlanLimitError({ message: 123 })).toBe(false);
	});
});

describe("wouldExceedStorageQuota — non-destructive pre-check", () => {
	it("is true when used + incoming is at or over a finite quota (>= boundary)", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 10 * GB, limitGb: 10, unlimited: false },
				1,
			),
		).toBe(true);
	});

	it("is true exactly at the quota with zero incoming bytes", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 10 * GB, limitGb: 10, unlimited: false },
				0,
			),
		).toBe(true);
	});

	it("is false when used + incoming is comfortably under a finite quota", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 1, limitGb: 10, unlimited: false },
				1,
			),
		).toBe(false);
	});

	it("is always false for an unlimited (Max) owner even when far over any number", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 999 * GB, limitGb: 10, unlimited: true },
				GB,
			),
		).toBe(false);
	});

	it("is always false for a negative limit (-1 = unlimited/grandfathered sentinel)", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 999 * GB, limitGb: -1, unlimited: false },
				GB,
			),
		).toBe(false);
	});

	it("clamps a negative incoming byte count to zero (no false pass under quota)", () => {
		expect(
			wouldExceedStorageQuota(
				{ usedBytes: 1, limitGb: 10, unlimited: false },
				-999,
			),
		).toBe(false);
	});
});
