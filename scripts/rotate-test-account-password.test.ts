// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	ACCOUNTS,
	generatePassword,
	isAccountName,
	upsertEnvLines,
} from "./rotate-test-account-password";

describe("rotate-test-account-password — which accounts", () => {
	it("allows only the three synthetic e2e accounts", () => {
		expect(Object.values(ACCOUNTS).map((a) => a.email)).toEqual([
			"e2e-owner-a@tenantflow.app",
			"e2e-owner-b@tenantflow.app",
			"e2e-admin@tenantflow.app",
		]);
	});

	it("names the variables the suites read for each account", () => {
		expect(ACCOUNTS["owner-b"]).toMatchObject({
			emailVar: "E2E_OWNER_B_EMAIL",
			passwordVar: "E2E_OWNER_B_PASSWORD",
		});
		expect(ACCOUNTS["owner-a"].passwordVar).toBe("E2E_OWNER_PASSWORD");
		expect(ACCOUNTS.admin.passwordVar).toBe("E2E_ADMIN_PASSWORD");
	});

	it("refuses any other name, including inherited object keys", () => {
		expect(isAccountName("owner-b")).toBe(true);
		for (const name of [undefined, "", "owner-c", "toString", "__proto__"]) {
			expect(isAccountName(name)).toBe(false);
		}
	});
});

describe("rotate-test-account-password — the password", () => {
	it("is 32 URL-safe characters that need no quoting", () => {
		const password = generatePassword();
		expect(password).toMatch(/^[A-Za-z0-9_-]{32}$/);
	});

	it("differs on every call", () => {
		expect(generatePassword()).not.toBe(generatePassword());
	});
});

describe("rotate-test-account-password — upsertEnvLines", () => {
	const ENTRIES = {
		E2E_OWNER_B_EMAIL: "b@x.test",
		E2E_OWNER_B_PASSWORD: "new",
	};

	it("replaces existing lines in place and keeps every other line", () => {
		const before = [
			"# comment",
			"E2E_OWNER_EMAIL=a@x.test",
			"E2E_OWNER_B_EMAIL=old@x.test",
			"",
			"export E2E_OWNER_B_PASSWORD='old'",
			"OTHER=1",
			"",
		].join("\n");
		expect(upsertEnvLines(before, ENTRIES)).toBe(
			[
				"# comment",
				"E2E_OWNER_EMAIL=a@x.test",
				"E2E_OWNER_B_EMAIL=b@x.test",
				"",
				"E2E_OWNER_B_PASSWORD=new",
				"OTHER=1",
				"",
			].join("\n"),
		);
	});

	it("appends missing lines, and creates the file's text from nothing", () => {
		expect(upsertEnvLines("A=1", ENTRIES)).toBe(
			"A=1\nE2E_OWNER_B_EMAIL=b@x.test\nE2E_OWNER_B_PASSWORD=new\n",
		);
		expect(upsertEnvLines("", ENTRIES)).toBe(
			"E2E_OWNER_B_EMAIL=b@x.test\nE2E_OWNER_B_PASSWORD=new\n",
		);
	});

	it("never mistakes a longer name for the one it sets", () => {
		expect(
			upsertEnvLines("E2E_OWNER_B_PASSWORD_OLD=keep\n", {
				E2E_OWNER_B_PASSWORD: "new",
			}),
		).toBe("E2E_OWNER_B_PASSWORD_OLD=keep\nE2E_OWNER_B_PASSWORD=new\n");
	});
});
