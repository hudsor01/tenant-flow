// @vitest-environment node
/**
 * The e2e config carries no Supabase key literal and still imports with none set.
 *
 * WHAT WENT WRONG. `playwright.config.ts` fell back to a hard-coded JWT (the
 * local stack's legacy demo anon key) whenever NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * was unset. A key literal in a tracked file is what a secrets scan exists to
 * reject, and this one could not even authenticate: the hosted project has legacy
 * JWT keys disabled, so the fallback only ever turned a missing variable into a
 * confusing sign-in failure.
 *
 * WHAT THIS FILE PROVES.
 *   1. With the variable unset, the config still IMPORTS -- typecheck, `--list`
 *      and a run that reuses a live :3050 server need no key -- and the web
 *      server command is a fast failure that names the variable to set.
 *   2. With the variable set, the server command is the real one and the key
 *      reaches the server's environment, so CI and local behaviour are unchanged.
 *
 * `dotenv` is mocked: the real config loads tests/e2e/.env.test, which holds
 * credentials that have no business in the unit process.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

interface WebServerEntry {
	readonly command: string;
	readonly env?: Record<string, string>;
}

function isWebServerEntry(value: unknown): value is WebServerEntry {
	return (
		typeof value === "object" &&
		value !== null &&
		"command" in value &&
		typeof value.command === "string"
	);
}

async function loadWebServer(): Promise<WebServerEntry> {
	vi.resetModules();
	const mod = await import("../../playwright.config");
	const servers: unknown = mod.default.webServer;
	const first: unknown = Array.isArray(servers) ? servers[0] : servers;
	if (!isWebServerEntry(first)) {
		throw new Error("playwright.config.ts declares no webServer command");
	}
	return first;
}

describe("playwright.config.ts publishable key", () => {
	let saved: string | undefined;

	beforeEach(() => {
		saved = process.env[KEY];
	});

	afterEach(() => {
		if (saved === undefined) delete process.env[KEY];
		else process.env[KEY] = saved;
	});

	it("imports with the key unset and fails only when the server must start", async () => {
		delete process.env[KEY];
		const server = await loadWebServer();
		expect(server.command).toContain(`${KEY} is not set`);
		expect(server.command).toMatch(/exit 1$/);
		expect(server.command).not.toContain("next ");
		expect(server.command).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}/);
	});

	it("starts the real server with the key from the environment", async () => {
		process.env[KEY] = "sb_publishable_unit_test";
		const server = await loadWebServer();
		expect(server.command).toMatch(/npx next (start|dev)/);
		expect(server.command).toContain(
			`export ${KEY}='sb_publishable_unit_test'`,
		);
		expect(server.env?.[KEY]).toBe("sb_publishable_unit_test");
	});
});
