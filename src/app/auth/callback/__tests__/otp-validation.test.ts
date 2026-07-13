import { describe, expect, it } from "vitest";

import {
	failureRedirectPath,
	isValidOtpType,
	successRedirectPath,
	VALID_OTP_TYPES,
} from "../route";

describe("isValidOtpType", () => {
	it('accepts "signup" as valid', () => {
		expect(isValidOtpType("signup")).toBe(true);
	});

	it('accepts "email" as valid', () => {
		expect(isValidOtpType("email")).toBe(true);
	});

	it('accepts "recovery" as valid', () => {
		expect(isValidOtpType("recovery")).toBe(true);
	});

	it('accepts "magiclink" as valid', () => {
		expect(isValidOtpType("magiclink")).toBe(true);
	});

	it('accepts "invite" as valid', () => {
		expect(isValidOtpType("invite")).toBe(true);
	});

	it('accepts "email_change" as valid', () => {
		expect(isValidOtpType("email_change")).toBe(true);
	});

	it('rejects "faketype" as invalid', () => {
		expect(isValidOtpType("faketype")).toBe(false);
	});

	it("rejects null as invalid", () => {
		expect(isValidOtpType(null)).toBe(false);
	});

	it("rejects empty string as invalid", () => {
		expect(isValidOtpType("")).toBe(false);
	});
});

describe("VALID_OTP_TYPES", () => {
	it("contains exactly 6 types", () => {
		expect(VALID_OTP_TYPES).toHaveLength(6);
	});

	it("includes all expected types", () => {
		expect(VALID_OTP_TYPES).toContain("signup");
		expect(VALID_OTP_TYPES).toContain("email");
		expect(VALID_OTP_TYPES).toContain("recovery");
		expect(VALID_OTP_TYPES).toContain("magiclink");
		expect(VALID_OTP_TYPES).toContain("invite");
		expect(VALID_OTP_TYPES).toContain("email_change");
	});
});

describe("successRedirectPath", () => {
	it("routes signup to the dashboard", () => {
		expect(successRedirectPath("signup", "/dashboard")).toBe("/dashboard");
	});

	it("routes email to the dashboard", () => {
		expect(successRedirectPath("email", "/dashboard")).toBe("/dashboard");
	});

	it("routes recovery to update-password", () => {
		expect(successRedirectPath("recovery", "/dashboard")).toBe(
			"/auth/update-password",
		);
	});

	it("routes invite to update-password (password-less invited user)", () => {
		expect(successRedirectPath("invite", "/dashboard")).toBe(
			"/auth/update-password",
		);
	});

	it("routes magiclink to the sanitized next param", () => {
		expect(successRedirectPath("magiclink", "/properties?page=2")).toBe(
			"/properties?page=2",
		);
	});

	it("routes email_change to settings with a confirmed flag", () => {
		expect(successRedirectPath("email_change", "/dashboard")).toBe(
			"/settings?email_change=confirmed",
		);
	});
});

describe("failureRedirectPath", () => {
	it("routes signup failure to confirm-email with an invalid-token banner", () => {
		expect(failureRedirectPath("signup")).toBe(
			"/auth/confirm-email?error=invalid_token",
		);
	});

	it("routes email failure to confirm-email with an invalid-token banner", () => {
		expect(failureRedirectPath("email")).toBe(
			"/auth/confirm-email?error=invalid_token",
		);
	});

	it("routes recovery failure to the update-password error hash", () => {
		expect(failureRedirectPath("recovery")).toBe(
			"/auth/update-password#error=access_denied&error_description=This+link+has+expired+or+is+invalid",
		);
	});

	it("routes magiclink failure to login with the link_expired code", () => {
		expect(failureRedirectPath("magiclink")).toBe("/login?error=link_expired");
	});

	it("routes invite failure to login with the link_expired code", () => {
		expect(failureRedirectPath("invite")).toBe("/login?error=link_expired");
	});

	it("routes email_change failure to settings with a failed flag", () => {
		expect(failureRedirectPath("email_change")).toBe(
			"/settings?email_change=failed",
		);
	});
});
