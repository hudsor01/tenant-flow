import { describe, expect, it } from "vitest";
import { requiresMfaStepUp } from "../mfa-assurance";

describe("requiresMfaStepUp", () => {
	it("returns true for an enrolled aal1 session (nextLevel aal2, currentLevel aal1) → BLOCK", () => {
		expect(requiresMfaStepUp({ currentLevel: "aal1", nextLevel: "aal2" })).toBe(
			true,
		);
	});

	it("returns false for an already-stepped-up aal2 session → ALLOW", () => {
		expect(requiresMfaStepUp({ currentLevel: "aal2", nextLevel: "aal2" })).toBe(
			false,
		);
	});

	it("returns false for a no-MFA aal1 session (nextLevel aal1) → ALLOW, no false lockout", () => {
		expect(requiresMfaStepUp({ currentLevel: "aal1", nextLevel: "aal1" })).toBe(
			false,
		);
	});

	it("returns false for null (unknown assurance level)", () => {
		expect(requiresMfaStepUp(null)).toBe(false);
	});

	it("returns true when currentLevel is null but nextLevel is aal2", () => {
		expect(requiresMfaStepUp({ currentLevel: null, nextLevel: "aal2" })).toBe(
			true,
		);
	});
});
