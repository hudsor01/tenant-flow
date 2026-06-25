import { describe, expect, it } from "vitest";
import { assertNever } from "#lib/assert-never";

function thrownMessage(fn: () => unknown): string {
	try {
		fn();
	} catch (err) {
		return (err as Error).message;
	}
	throw new Error("expected assertNever to throw");
}

describe("assertNever", () => {
	it("throws including the unhandled value", () => {
		expect(thrownMessage(() => assertNever("surprise" as never))).toContain(
			"Unhandled case: surprise",
		);
	});

	it("includes the context label when provided", () => {
		expect(
			thrownMessage(() => assertNever("surprise" as never, "myMapper")),
		).toContain("Unhandled case in myMapper: surprise");
	});
});
