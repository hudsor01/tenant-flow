/**
 * MaintenanceFormFields source assertion
 *
 * DASH-19: the title Input is the primary text input and must carry `autoFocus`
 * (CLAUDE.md Forms rule). Behavioral focus tests on inputs inside Radix Dialog +
 * TanStack Form are flaky in jsdom, so this asserts the prop is present in source.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MaintenanceFormFields autoFocus", () => {
	it("sets autoFocus on the title input", () => {
		const source = readFileSync(
			resolve(
				process.cwd(),
				"src/components/maintenance/maintenance-form-fields.tsx",
			),
			"utf8",
		);
		// The title Input block (id="title") must include the autoFocus prop.
		expect(source).toMatch(/id="title"[\s\S]*?autoFocus/);
	});
});
