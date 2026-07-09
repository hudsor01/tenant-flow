/**
 * FORMFIX-03: useFormWithProgress must not render-loop.
 *
 * Regression: the auto-save effect depended on the whole `progress` object
 * (recreated every render), so it fired on every render → saveProgress →
 * localStorage write → setState → re-render → spin. The fix keys the effect on
 * stable identities (`saveProgress` via useCallback, `progress.isLoading`) and
 * guards the write on an actual serialized-value change.
 *
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormProgressData } from "#types/core";
import { useFormWithProgress } from "./use-form-progress";

interface TestValues extends FormProgressData {
	email: string;
	name: string;
	password?: string;
}

const noopSubmit = vi.fn(async () => {});

// This project's jsdom does not expose a usable global `localStorage`; install a
// minimal in-memory mock so both the hook (bare `localStorage`) and the assertions
// share one store and setItem calls are observable.
const store = new Map<string, string>();
const localStorageMock = {
	getItem: vi.fn((key: string) => store.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => {
		store.set(key, value);
	}),
	removeItem: vi.fn((key: string) => {
		store.delete(key);
	}),
	clear: vi.fn(() => {
		store.clear();
	}),
	key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
	get length() {
		return store.size;
	},
};

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	configurable: true,
	writable: true,
});

function countWrites(formType: string): number {
	return localStorageMock.setItem.mock.calls.filter(
		(call) => call[0] === `form-progress-${formType}`,
	).length;
}

describe("useFormWithProgress (FORMFIX-03)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.clear();
	});

	it("saves exactly once per real change and not on unchanged re-renders", async () => {
		const { result, rerender } = renderHook(() =>
			useFormWithProgress<TestValues>("contact", noopSubmit, {
				email: "",
				name: "",
			}),
		);

		await waitFor(() => expect(result.current.isHydrated).toBe(true));
		// Empty data → no write yet.
		expect(countWrites("contact")).toBe(0);

		act(() => {
			result.current.updateField("email", "user@example.com");
		});

		// Exactly one save for the real change.
		await waitFor(() => {
			expect(countWrites("contact")).toBe(1);
		});

		// Re-rendering with unchanged data produces zero additional writes
		// (the whole `progress` object is no longer a dependency + change guard).
		rerender();
		rerender();
		rerender();
		await act(async () => {
			await Promise.resolve();
		});
		expect(countWrites("contact")).toBe(1);
	});

	it("saves once more only when a saved field actually changes again", async () => {
		const { result } = renderHook(() =>
			useFormWithProgress<TestValues>("contact", noopSubmit, {
				email: "",
				name: "",
			}),
		);

		await waitFor(() => expect(result.current.isHydrated).toBe(true));

		act(() => {
			result.current.updateField("email", "a@example.com");
		});
		await waitFor(() => expect(countWrites("contact")).toBe(1));

		act(() => {
			result.current.updateField("name", "Ada");
		});
		await waitFor(() => expect(countWrites("contact")).toBe(2));
	});

	it("never persists passwords", async () => {
		const { result } = renderHook(() =>
			useFormWithProgress<TestValues>("signup", noopSubmit, {
				email: "",
				name: "",
				password: "",
			}),
		);

		await waitFor(() => expect(result.current.isHydrated).toBe(true));

		act(() => {
			result.current.updateField("email", "user@example.com");
			result.current.updateField("password", "super-secret");
		});

		await waitFor(() => {
			expect(countWrites("signup")).toBeGreaterThan(0);
		});

		for (const [key, value] of localStorageMock.setItem.mock.calls) {
			if (key === "form-progress-signup") {
				const parsed = JSON.parse(value);
				expect(parsed.password).toBeUndefined();
				expect(parsed.confirmPassword).toBeUndefined();
				expect(parsed.email).toBe("user@example.com");
			}
		}
	});

	it("restores persisted data after hydration without a redundant self-save", async () => {
		store.set(
			"form-progress-contact",
			JSON.stringify({ email: "saved@example.com", name: "Saved" }),
		);

		const { result } = renderHook(() =>
			useFormWithProgress<TestValues>("contact", noopSubmit, {
				email: "",
				name: "",
			}),
		);

		// Draft is restored into form state once.
		await waitFor(() =>
			expect(result.current.formData.email).toBe("saved@example.com"),
		);
		expect(result.current.formData.name).toBe("Saved");

		// Settle window: the change guard is primed by the restore, so no write
		// bounces the restored data straight back (no ping-pong).
		await act(async () => {
			await Promise.resolve();
		});
		const writesAfterRestore = countWrites("contact");
		expect(writesAfterRestore).toBe(0);

		await act(async () => {
			await Promise.resolve();
		});
		expect(countWrites("contact")).toBe(writesAfterRestore);
	});
});
