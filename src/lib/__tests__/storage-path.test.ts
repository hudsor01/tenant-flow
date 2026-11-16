import { describe, expect, it } from "vitest";
import { DiagnosticError } from "#lib/diagnostic-error";
import {
	isSafeStorageObjectPath,
	requireSafeStorageObjectPath,
	safeFileExtension,
	sanitizeStorageFileName,
	storageObjectPath,
} from "#lib/storage-path";

const UUID = "3f2b8c1e-9d4a-4e6b-8f1c-2a7d5e9b0c34";

// supabase-js builds upload/download/createSignedUrl URLs by appending the path
// to this prefix unencoded, so the URL parser decides which object is reached.
const BUCKET_URL =
	"https://ref.supabase.co/storage/v1/object/tenant-documents/";
const BUCKET_PATHNAME = new URL(BUCKET_URL).pathname;

describe("safeFileExtension", () => {
	it.each([
		["photo.jpg", "jpg"],
		["photo.JPEG", "jpeg"],
		["SCAN.PNG", "png"],
		["archive.tar.gz", "gz"],
		["фото.webp", "webp"],
		["照片 1.HEIC", "heic"],
		["lease.abcdefghij", "abcdefghij"],
		["v2.mp4", "mp4"],
	])("%j -> %j", (name, expected) => {
		expect(safeFileExtension(name, "bin")).toBe(expected);
	});

	it.each([
		["noext"],
		[""],
		[".bashrc"],
		["photo."],
		["a.b.."],
		["x.png/../../etc"],
		["evil.p/hp"],
		["evil.p\\hp"],
		["file.ｐｎｇ"],
		["file.abcdefghijk"],
		["file.j pg"],
		["file.%2e"],
		["file.png\u0000"],
		["file.ph-p"],
	])("%j -> fallback", (name) => {
		expect(safeFileExtension(name, "bin")).toBe("bin");
	});
});

describe("storageObjectPath", () => {
	it.each([
		[["a"], "a"],
		[
			["property", UUID, "1700000000000-lease.pdf"],
			`property/${UUID}/1700000000000-lease.pdf`,
		],
		[[UUID, "avatar.jpeg"], `${UUID}/avatar.jpeg`],
		[["фото", "照片 1.png"], "фото/照片 1.png"],
		[["a%2e%2eb", "%252e%252e", "..."], "a%2e%2eb/%252e%252e/..."],
		[[".hidden", "trailing."], ".hidden/trailing."],
	])("%j -> %j", (segments, expected) => {
		expect(storageObjectPath(...segments)).toBe(expected);
	});

	it.each([
		[[]],
		[[""]],
		[["a", ""]],
		[["."]],
		[[".."]],
		[["%2e%2e"]],
		[["%2E%2e"]],
		[[".%2e"]],
		[["%2e"]],
		[["a/b"]],
		[["../x"]],
		[["a", "../b"]],
		[["x.png/../../etc"]],
		[["/abs"]],
		[["a\\b"]],
		[["a\u0000b"]],
		[["a\tb"]],
		[["a\nb"]],
		[["\u007f"]],
		[["a\u0085b"]],
		[["..?x"]],
		[["a", "..#b"]],
		[["a", ".. "]],
		[["a?b"]],
		[["a#b"]],
		[[" a"]],
		[["a "]],
	])("rejects %j", (segments) => {
		expect(() => storageObjectPath(...segments)).toThrow(DiagnosticError);
	});

	it("keeps a sanitized hostile file name inside its folder", () => {
		const path = storageObjectPath(
			"property",
			UUID,
			`1700000000000-${sanitizeStorageFileName("../../etc/passwd")}`,
		);
		expect(path).toBe(`property/${UUID}/1700000000000-.._.._etc_passwd`);
		expect(isSafeStorageObjectPath(path)).toBe(true);
	});
});

const ACCEPTED_PATHS = [
	"a",
	"a/b",
	`property/${UUID}/1700000000000-lease.pdf`,
	`lease/${UUID}/signed-lease.pdf`,
	`${UUID}/avatar.jpg`,
	"фото/照片 1.png",
	"a%2e%2eb/c",
	"%252e%252e/x",
	".../x",
	"a/.b/c.",
	"photo.JPEG",
];

const REJECTED_PATHS = [
	"",
	"/",
	"/abs",
	"a/",
	"a//b",
	"../x",
	"a/../b",
	"./a",
	"a/./b",
	"a/..",
	"x.png/../../etc",
	"a\\b",
	"..\\x",
	"%2e%2e",
	"a/%2e%2e/b",
	"%2E%2E/x",
	"a/.%2E/b",
	"a/%2e./b",
	"a/%2e/b",
	"a\u0000b",
	"a\tb",
	"a/.\t./b",
	"a\nb",
	"a/\u0085/b",
	`lease/${UUID}/..?x`,
	`lease/${UUID}/..#x`,
	`lease/${UUID}/.. `,
	`lease/${UUID}/%2e%2e?`,
	"..?x",
	"a/..#b",
	"a/.. ",
	"%2e%2e?",
	"a/b?c",
	"a#b",
	" a/b",
	"a /b",
	"a/b ",
];

describe("isSafeStorageObjectPath", () => {
	it.each(ACCEPTED_PATHS)("accepts %j", (path) => {
		expect(isSafeStorageObjectPath(path)).toBe(true);
	});

	it.each(REJECTED_PATHS)("rejects %j", (path) => {
		expect(isSafeStorageObjectPath(path)).toBe(false);
	});

	it.each(ACCEPTED_PATHS)(
		"%j stays inside the bucket once the URL parser resolves it",
		(path) => {
			const resolved = new URL(BUCKET_URL + path).pathname;
			expect(resolved.startsWith(BUCKET_PATHNAME)).toBe(true);
			expect(resolved.split("/").length).toBe(
				BUCKET_PATHNAME.split("/").length - 1 + path.split("/").length,
			);
		},
	);

	// Each climbs five levels, out of Storage to the PostgREST endpoint on the
	// same host, so a service-role download would read the users table.
	it.each([
		"a/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/rest/v1/users",
		"a/../../../../../rest/v1/users",
		"a\\..\\..\\..\\..\\..\\rest\\v1\\users",
		"a/.\t./.\n./.%2E/%2e./%2E%2E/rest/v1/users",
	])("%j would leave the bucket, which is why it is rejected", (path) => {
		expect(isSafeStorageObjectPath(path)).toBe(false);
		expect(new URL(BUCKET_URL + path).pathname).toBe("/rest/v1/users");
	});
});

describe("isSafeStorageObjectPath: what the URL parser cuts off", () => {
	// "?" starts the query, "#" the fragment, and a space at the end of the URL
	// is trimmed, so each leaves a bare ".." as the last segment and the request
	// climbs one level, out of the folder that was checked.
	it.each([
		[`lease/${UUID}/..?x`, "/storage/v1/object/tenant-documents/lease/"],
		[`lease/${UUID}/..#x`, "/storage/v1/object/tenant-documents/lease/"],
		[`lease/${UUID}/.. `, "/storage/v1/object/tenant-documents/lease/"],
		[`lease/${UUID}/%2e%2e?`, "/storage/v1/object/tenant-documents/lease/"],
		["..?x", "/storage/v1/object/"],
	])("%j resolves to %j, which is why it is rejected", (path, resolved) => {
		expect(isSafeStorageObjectPath(path)).toBe(false);
		expect(new URL(BUCKET_URL + path).pathname).toBe(resolved);
	});

	// A space inside a segment is percent-encoded rather than trimmed, so the
	// object is reached as named.
	it("keeps a path with an inner space inside the bucket", () => {
		const path = "фото/照片 1.png";
		expect(isSafeStorageObjectPath(path)).toBe(true);
		expect(new URL(BUCKET_URL + path).pathname).toBe(
			`${BUCKET_PATHNAME}%D1%84%D0%BE%D1%82%D0%BE/%E7%85%A7%E7%89%87%201.png`,
		);
	});
});

describe("requireSafeStorageObjectPath", () => {
	it.each(ACCEPTED_PATHS)("returns %j unchanged", (path) => {
		expect(requireSafeStorageObjectPath(path)).toBe(path);
	});

	it.each(REJECTED_PATHS)("throws a DiagnosticError for %j", (path) => {
		expect(() => requireSafeStorageObjectPath(path)).toThrow(DiagnosticError);
	});
});

describe("sanitizeStorageFileName", () => {
	it.each([
		["lease.pdf", "lease.pdf"],
		["my lease (final).pdf", "my_lease_(final).pdf"],
		["a   b\t\nc.pdf", "a_b_c.pdf"],
		["../../etc/passwd", ".._.._etc_passwd"],
		['a\\b?c%d*e:f|g"h<i>j#k&l', "a_b_c_d_e_f_g_h_i_j_k_l"],
		["фото 1.png", "фото_1.png"],
		["%2e%2e", "_2e_2e"],
	])("%j -> %j", (name, expected) => {
		expect(sanitizeStorageFileName(name)).toBe(expected);
	});
});
