/**
 * UnitFormFields source assertion
 *
 * DASH-23: the unit_number field is the primary input and must carry
 * `autoFocus` (CLAUDE.md Forms rule). TextField spreads inputProps onto Input,
 * so the prop passes through. Behavioral focus tests on TanStack Form fields are
 * flaky in jsdom, so this asserts the prop is present in source.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("UnitFormFields autoFocus", () => {
	it("sets autoFocus on the unit_number field", () => {
		const source = readFileSync(
			resolve(process.cwd(), "src/components/units/unit-form-fields.tsx"),
			"utf8",
		);
		// The unit_number AppField's TextField must include the autoFocus prop.
		expect(source).toMatch(/name="unit_number"[\s\S]*?autoFocus/);
	});
});
