/**
 * @vitest-environment node
 *
 * download-documents-zip streams up to 500 documents after its Response has
 * been returned, so the pump can outlive the caller's access token, which
 * nothing refreshes. Storage RLS is therefore applied once, up front: every
 * in-folder path is signed under the caller's JWT before the stream starts,
 * and the pump fetches those signed URLs, which do not depend on the token.
 *
 * The function itself calls `Deno.serve` at import, so Vitest cannot load it.
 * The helpers it uses are pinned here directly, and the source is read from
 * disk to pin the order: sign before the stream, fetch inside it, and never a
 * per-document `download` (token-bound or service role).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
	fetchSignedObject,
	type SignedUrlEntry,
	signedUrlsByPath,
} from "../_shared/signed-url-fetch";
import { isInStorageFolder } from "../_shared/storage-path";

const ENTITY_ID = "3f2b8c1e-9d4a-4e6b-8f1c-2a7d5e9b0c34";
const OTHER_ID = "9a1c4e2b-7d3f-4b8a-9c6e-1f2a3b4c5d6e";
const ORIGIN = "https://ref.supabase.co";

describe("isInStorageFolder: the zip's entity-folder check", () => {
	it.each([
		`property/${ENTITY_ID}/1700000000000-lease.pdf`,
		`property/${ENTITY_ID}/sub/scan.png`,
		`property/${ENTITY_ID}/照片 1.png`,
	])("accepts %j inside property/<id>/", (path) => {
		expect(isInStorageFolder(path, "property", ENTITY_ID)).toBe(true);
	});

	it.each([
		["another entity's folder", `property/${OTHER_ID}/lease.pdf`],
		["another entity type", `lease/${ENTITY_ID}/lease.pdf`],
		["a longer id with the same prefix", `property/${ENTITY_ID}0/lease.pdf`],
		["the folder itself", `property/${ENTITY_ID}/`],
		["the folder without a slash", `property/${ENTITY_ID}`],
		["a dot segment out of it", `property/${ENTITY_ID}/../${OTHER_ID}/x.pdf`],
		["an encoded dot segment", `property/${ENTITY_ID}/%2e%2e/x.pdf`],
		["a dot segment cut off by a query", `property/${ENTITY_ID}/..?x`],
		["a dot segment cut off by a fragment", `property/${ENTITY_ID}/..#x`],
		["a trailing-space dot segment", `property/${ENTITY_ID}/.. `],
		["a backslash", `property/${ENTITY_ID}/..\\x.pdf`],
		["a leading slash", `/property/${ENTITY_ID}/x.pdf`],
		["upper-case id", `property/${ENTITY_ID.toUpperCase()}/x.pdf`],
	])("refuses %s", (_label, path) => {
		expect(isInStorageFolder(path, "property", ENTITY_ID)).toBe(false);
	});

	it.each([
		["no folder segments", []],
		["an empty segment", ["property", ""]],
		["a segment holding a slash", ["property/x", ENTITY_ID]],
		["a dot segment", ["property", ".."]],
		["a segment holding a query", ["property", `${ENTITY_ID}?`]],
	])("refuses any path when the folder has %s", (_label, folder) => {
		expect(isInStorageFolder(`property/${ENTITY_ID}/x.pdf`, ...folder)).toBe(
			false,
		);
	});
});

describe("signedUrlsByPath", () => {
	const signed = (path: string): SignedUrlEntry => ({
		path,
		signedUrl: `${ORIGIN}/storage/v1/object/sign/tenant-documents/${path}?token=t`,
		error: null,
	});

	it("maps each signed path to its URL", () => {
		const a = signed("property/a/1.pdf");
		const b = signed("property/b/2.pdf");
		expect(signedUrlsByPath([a, b], ORIGIN)).toEqual(
			new Map([
				["property/a/1.pdf", a.signedUrl],
				["property/b/2.pdf", b.signedUrl],
			]),
		);
	});

	it.each([
		[
			"an entry Storage refused",
			{
				path: "property/x/1.pdf",
				signedUrl: null,
				error:
					"Either the object does not exist or you do not have access to it",
			},
		],
		[
			"an entry with an error but a URL",
			{
				...signed("property/x/1.pdf"),
				error:
					"Either the object does not exist or you do not have access to it",
			},
		],
		["an entry with no path", { ...signed("property/x/1.pdf"), path: null }],
		[
			"a URL on another host",
			{
				...signed("property/x/1.pdf"),
				signedUrl: "https://evil.example/storage/v1/object/sign/x?token=t",
			},
		],
		[
			"a URL on another scheme",
			{
				...signed("property/x/1.pdf"),
				signedUrl: "http://ref.supabase.co/storage/v1/object/sign/x?token=t",
			},
		],
		[
			"a URL that does not parse",
			{ ...signed("property/x/1.pdf"), signedUrl: "not a url" },
		],
	])("leaves out %s", (_label, entry: SignedUrlEntry) => {
		expect(signedUrlsByPath([entry], ORIGIN).size).toBe(0);
	});
});

describe("fetchSignedObject", () => {
	const SIGNED_URL = `${ORIGIN}/storage/v1/object/sign/tenant-documents/a.pdf?token=t`;

	it("returns the body of a 2xx answer", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () => new Response("%PDF"));
		const result = await fetchSignedObject(SIGNED_URL, fetchImpl);
		expect(fetchImpl).toHaveBeenCalledWith(SIGNED_URL);
		expect(result.error).toBeNull();
		expect(await result.blob?.text()).toBe("%PDF");
	});

	it("resolves a non-2xx answer as http_<status> without a body", async () => {
		const fetchImpl = vi.fn<typeof fetch>(
			async () => new Response("expired", { status: 400 }),
		);
		expect(await fetchSignedObject(SIGNED_URL, fetchImpl)).toEqual({
			blob: null,
			error: "http_400",
		});
	});

	it("resolves a network failure instead of throwing", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () => {
			throw new TypeError("connection reset");
		});
		expect(await fetchSignedObject(SIGNED_URL, fetchImpl)).toEqual({
			blob: null,
			error: "connection reset",
		});
	});
});

describe("download-documents-zip signs before it streams", () => {
	const SOURCE = readFileSync(
		fileURLToPath(
			new URL("../download-documents-zip/index.ts", import.meta.url),
		),
		"utf8",
	);
	const streamStart = SOURCE.indexOf("new TransformStream");

	it("signs every URL under the caller's JWT before the stream starts", () => {
		const signCall = SOURCE.search(
			/userClient\.storage\s*\.from\(BUCKET\)\s*\.createSignedUrls\(/,
		);
		expect(streamStart).toBeGreaterThan(0);
		expect(signCall).toBeGreaterThan(0);
		expect(signCall).toBeLessThan(streamStart);
	});

	it("fetches the signed URLs inside the pump", () => {
		const fetchCall = SOURCE.indexOf("await fetchSignedObject(");
		expect(fetchCall).toBeGreaterThan(streamStart);
	});

	it("never downloads a document through a Supabase client", () => {
		expect(SOURCE).not.toMatch(/\.download\(/);
		expect(SOURCE).not.toMatch(/adminClient\.storage/);
	});

	it("signs URLs that outlast the 400-second Edge wall-clock limit", () => {
		const ttl = /const SIGNED_URL_TTL_SECONDS = (\d+);/.exec(SOURCE)?.[1];
		expect(Number(ttl)).toBeGreaterThanOrEqual(400);
		expect(SOURCE).toMatch(
			/\.createSignedUrls\(pathsToSign, SIGNED_URL_TTL_SECONDS\)/,
		);
	});
});
