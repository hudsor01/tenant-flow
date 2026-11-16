/**
 * The storage path rules are written twice: `src/lib/storage-path.ts` for the
 * browser and `supabase/functions/_shared/storage-path.ts` for Edge Functions,
 * which cannot import src/. A rule loosened on one side only would let a path
 * through there that the other side refuses, and the Edge side runs with the
 * service role, which storage RLS never checks. This file runs one case table
 * through both implementations and requires the same answer from each.
 */

import { describe, expect, it } from "vitest";
import {
	isSafeStorageObjectPath as srcIsSafe,
	storageObjectPath as srcBuild,
} from "#lib/storage-path";
import {
	isSafeStorageObjectPath as edgeIsSafe,
	storageObjectPath as edgeBuild,
} from "../_shared/storage-path";

const UUID = "3f2b8c1e-9d4a-4e6b-8f1c-2a7d5e9b0c34";

const PATH_CASES: ReadonlyArray<[path: string, safe: boolean]> = [
	["a", true],
	["a/b", true],
	[`lease/${UUID}/signed-lease.pdf`, true],
	[`property/${UUID}/1700000000000-lease.pdf`, true],
	["фото/照片 1.png", true],
	["a%2e%2eb/c", true],
	["%252e%252e/x", true],
	[".../x", true],
	["a/.b/c.", true],
	["", false],
	["/", false],
	["/abs", false],
	["a/", false],
	["a//b", false],
	["../x", false],
	["a/../b", false],
	["./a", false],
	["a/./b", false],
	["x.png/../../etc", false],
	["a\\b", false],
	["..\\x", false],
	["%2e%2e", false],
	["a/%2E%2e/b", false],
	["a/.%2e/b", false],
	["a/%2e./b", false],
	["a/%2e/b", false],
	["a\u0000b", false],
	["a\tb", false],
	["a/.\t./b", false],
	["a\nb", false],
	["a/\u007f/b", false],
	["a/\u0085/b", false],
	[`lease/${UUID}/..?x`, false],
	[`lease/${UUID}/..#x`, false],
	[`lease/${UUID}/.. `, false],
	[`lease/${UUID}/%2e%2e?`, false],
	["..?x", false],
	["a/..#b", false],
	["a/.. ", false],
	["%2e%2e?", false],
	["a/b?c", false],
	["a#b", false],
	[" a/b", false],
	["a /b", false],
	["a/b ", false],
];

const BUILD_CASES: ReadonlyArray<[segments: string[], expected: string | null]> =
	[
		[["a"], "a"],
		[["lease", UUID, "signed-lease.pdf"], `lease/${UUID}/signed-lease.pdf`],
		[["фото", "照片 1.png"], "фото/照片 1.png"],
		[["a%2e%2eb", "..."], "a%2e%2eb/..."],
		[[], null],
		[[""], null],
		[["a", ""], null],
		[["."], null],
		[[".."], null],
		[["%2e%2e"], null],
		[["%2E."], null],
		[["a/b"], null],
		[["a", "../b"], null],
		[["x.png/../../etc"], null],
		[["a\\b"], null],
		[["a\u0000b"], null],
		[["a\tb"], null],
		[["..?x"], null],
		[["a", "..#b"], null],
		[["a", ".. "], null],
		[["a?b"], null],
		[["a#b"], null],
		[[" a"], null],
		[["a "], null],
	];

function buildOutcome(
	build: (...segments: string[]) => string,
	segments: string[],
): string | null {
	try {
		return build(...segments);
	} catch {
		return null;
	}
}

describe("storage path parity: isSafeStorageObjectPath", () => {
	it.each(PATH_CASES)("%j -> %s on both sides", (path, safe) => {
		expect(srcIsSafe(path)).toBe(safe);
		expect(edgeIsSafe(path)).toBe(safe);
	});
});

describe("storage path parity: storageObjectPath", () => {
	it.each(BUILD_CASES)("%j -> %j on both sides", (segments, expected) => {
		expect(buildOutcome(srcBuild, segments)).toBe(expected);
		expect(buildOutcome(edgeBuild, segments)).toBe(expected);
	});

	it("every path either side builds passes both checks", () => {
		const built = BUILD_CASES.flatMap(([, expected]) =>
			expected === null ? [] : [expected],
		);
		expect(built.length).toBeGreaterThan(0);
		for (const path of built) {
			expect(srcIsSafe(path)).toBe(true);
			expect(edgeIsSafe(path)).toBe(true);
		}
	});
});
