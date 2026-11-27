/**
 * Claims the console output a test means to cause (2026-11-27). The unit
 * setup fails any test that writes to the console unclaimed; a test that
 * exercises a failure path which logs on purpose claims that log here and
 * asserts it. The spy is restored when the test finishes, so the claim
 * never hides output from a later test.
 */
import { type MockInstance, onTestFinished, vi } from "vitest";

type ConsoleLevel = "error" | "warn" | "log" | "info" | "debug";

export function expectConsole(
	level: ConsoleLevel = "error",
): MockInstance<(...args: unknown[]) => void> {
	const spy = vi.spyOn(console, level).mockImplementation(() => undefined);
	onTestFinished(() => spy.mockRestore());
	return spy;
}
