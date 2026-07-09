/**
 * useSupabaseUpload tests (UIX-02)
 *
 * Pins the two upload-correctness fixes on the sole consumer path
 * (PropertyImageDropzone):
 *  (A) the retry list is a SINGLE filter — a failed file is re-uploaded at most
 *      once and an already-succeeded file is never re-uploaded, so a
 *      partial-failure retry can't create duplicate storage objects /
 *      property_images rows.
 *  (B) isSuccess is membership over the CURRENT batch (not a never-reset count),
 *      so it stays false until every current file has succeeded and can't leak a
 *      prior batch's success — and clearing the file list resets the tracker.
 */

import { act, renderHook } from "@testing-library/react";
import type { FileError } from "react-dropzone";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Supabase client factory boundary — control upload success/error per call.
const { mockUpload } = vi.hoisted(() => ({ mockUpload: vi.fn() }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		storage: {
			from: () => ({ upload: mockUpload }),
		},
	}),
}));

import { useSupabaseUpload } from "../use-supabase-upload";

type TestFile = File & { errors: readonly FileError[]; preview?: string };

function makeFile(name: string): TestFile {
	return Object.assign(new File(["x"], name, { type: "image/jpeg" }), {
		errors: [] as readonly FileError[],
	});
}

function renderUploadHook() {
	return renderHook(() =>
		useSupabaseUpload({ bucketName: "property-images", maxFiles: 10 }),
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	// Default: every upload succeeds.
	mockUpload.mockResolvedValue({ error: null });
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("retry list — single upload per file", () => {
	it("re-uploads only the failed file and never re-uploads a succeeded file", async () => {
		const a = makeFile("a.jpg");
		const b = makeFile("b.jpg");

		// a.jpg fails on its first attempt then succeeds; b.jpg always succeeds.
		let aAttempts = 0;
		mockUpload.mockImplementation((_path: string, file: File) => {
			if (file.name === "a.jpg") {
				aAttempts += 1;
				return Promise.resolve(
					aAttempts === 1
						? { error: { message: "network blip" } }
						: { error: null },
				);
			}
			return Promise.resolve({ error: null });
		});

		const { result } = renderUploadHook();

		await act(async () => {
			result.current.setFiles([a, b]);
		});

		// First batch: both attempted, a fails, b succeeds.
		await act(async () => {
			await result.current.onUpload();
		});

		expect(mockUpload).toHaveBeenCalledTimes(2);
		expect(result.current.errors).toEqual([
			{ name: "a.jpg", message: "network blip" },
		]);
		expect(result.current.successes).toEqual(["b.jpg"]);
		// Mid-retry state: a not yet succeeded → not a success.
		expect(result.current.isSuccess).toBe(false);

		// Retry: only a is in the upload set — b is skipped (already succeeded).
		await act(async () => {
			await result.current.onUpload();
		});

		// Exactly one more upload call (the retried a), not two.
		expect(mockUpload).toHaveBeenCalledTimes(3);
		const uploadedNames = mockUpload.mock.calls.map(
			(call) => (call[1] as File).name,
		);
		// b.jpg uploaded exactly once across both batches — no duplicate object.
		expect(uploadedNames.filter((n) => n === "b.jpg")).toHaveLength(1);
		// a.jpg uploaded twice total (initial failure + one retry).
		expect(uploadedNames.filter((n) => n === "a.jpg")).toHaveLength(2);

		expect(result.current.errors).toEqual([]);
		expect(result.current.successes).toEqual(["b.jpg", "a.jpg"]);
	});

	it("never uploads a client-invalid file (file.errors non-empty)", async () => {
		const good = makeFile("good.jpg");
		const bad = Object.assign(makeFile("bad.exe"), {
			errors: [{ code: "file-invalid-type", message: "bad type" }] as const,
		});

		const { result } = renderUploadHook();

		await act(async () => {
			result.current.setFiles([good, bad]);
		});
		await act(async () => {
			await result.current.onUpload();
		});

		// Only the client-valid file reaches storage.
		expect(mockUpload).toHaveBeenCalledTimes(1);
		expect((mockUpload.mock.calls[0]?.[1] as File).name).toBe("good.jpg");
	});
});

describe("isSuccess — membership over the current batch", () => {
	it("is false for an empty file list, false until all current files succeed, true only when every current file is in successes", async () => {
		const a = makeFile("a.jpg");
		const b = makeFile("b.jpg");

		const { result } = renderUploadHook();

		// Empty list → not a success.
		expect(result.current.isSuccess).toBe(false);

		await act(async () => {
			result.current.setFiles([a, b]);
		});
		// Files present but none uploaded yet → false.
		expect(result.current.isSuccess).toBe(false);

		await act(async () => {
			await result.current.onUpload();
		});
		// Both uploaded (default mock succeeds) → true only now.
		expect(result.current.successes).toEqual(["a.jpg", "b.jpg"]);
		expect(result.current.isSuccess).toBe(true);
	});

	it("resets successes when files are cleared so a fresh batch does not read success off a stale count", async () => {
		const a = makeFile("a.jpg");
		const b = makeFile("b.jpg");
		const c = makeFile("c.jpg");

		const { result } = renderUploadHook();

		await act(async () => {
			result.current.setFiles([a, b]);
		});
		await act(async () => {
			await result.current.onUpload();
		});
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.successes).toEqual(["a.jpg", "b.jpg"]);

		// Clear the list — the files-cleared effect resets successes.
		await act(async () => {
			result.current.setFiles([]);
		});
		expect(result.current.successes).toEqual([]);

		// A new single-file batch (count 1) must NOT read success off the old
		// two-entry successes list.
		await act(async () => {
			result.current.setFiles([c]);
		});
		expect(result.current.isSuccess).toBe(false);
	});
});
