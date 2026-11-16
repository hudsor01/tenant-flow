// Storage object paths for Edge Functions: the twin of src/lib/storage-path.ts,
// which they cannot import. Same rules, so a path one side accepts the other
// does too; supabase/functions/__tests__/storage-path-parity.test.ts runs one
// case table through both. `isInStorageFolder` is Edge-only: no browser code
// needs it. Keep this file import-free and Deno-free: tsc compiles it for the
// Vitest tests under supabase/functions/__tests__/.
//
// supabase-js puts an object path into the request URL unencoded for upload,
// download and createSignedUrl, and the URL parser resolves "." and ".."
// segments first, percent-encoded ones ("%2e%2e") included and with "\" read
// as "/". It also ends the path at "?" or "#" and trims spaces from the end of
// the URL, so a final "..?x", "..#x" or ".. " arrives as "..". With the service
// role, which storage RLS never checks, such a segment could send the request
// to another bucket or to another endpoint on the same host.

// "." and "..", spelled with any mix of "." and "%2e" (the URL parser reads
// "%2e" as a dot in a path segment, in either case).
const DOT_SEGMENT_RE = /^(?:\.|%2e){1,2}$/i;

// "\" (read as "/"), "?" (starts the query) and "#" (starts the fragment).
const URL_DELIMITER_RE = /[\\?#]/;

function hasControlCharacter(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		// C0 controls (NUL, tab, newline...), DEL, and C1 controls. The URL
		// parser drops tabs and newlines, so ".\t." would arrive as "..".
		if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
	}
	return false;
}

// The URL parser trims a space only at the end of the URL, but a segment edged
// with a space is refused wherever it sits: every upload name this app writes
// is a UUID or has its whitespace replaced, so none has one.
function isSafeSegment(segment: string): boolean {
	return (
		segment.length > 0 &&
		!DOT_SEGMENT_RE.test(segment) &&
		!URL_DELIMITER_RE.test(segment) &&
		!segment.startsWith(" ") &&
		!segment.endsWith(" ") &&
		!hasControlCharacter(segment)
	);
}

/**
 * Joins `segments` with "/". Throws when there are none, or when one is empty,
 * a dot segment, starts or ends with a space, or holds "/", "\", "?", "#" or a
 * control character, so an id can never add, drop or climb a segment.
 */
export function storageObjectPath(...segments: string[]): string {
	if (segments.length === 0) {
		throw new Error("storageObjectPath: no segments");
	}
	for (const [index, segment] of segments.entries()) {
		if (segment.includes("/") || !isSafeSegment(segment)) {
			throw new Error(
				`storageObjectPath: segment ${index} is empty, a dot segment, edged with a space, or holds a separator, "?", "#" or a control character`,
			);
		}
	}
	return segments.join("/");
}

/**
 * True when every "/"-separated segment of `path` passes the same check
 * `storageObjectPath` applies, so there is no leading, trailing or doubled "/",
 * no dot segment, no segment edged with a space, and no "\", "?", "#" or
 * control character.
 */
export function isSafeStorageObjectPath(path: string): boolean {
	return path.split("/").every(isSafeSegment);
}

/**
 * True when `path` passes `isSafeStorageObjectPath` and sits below the folder
 * that `folder` names (`isInStorageFolder(p, "lease", id)` wants
 * `lease/<id>/<name>`). False when there are no folder segments or one of them
 * is unsafe or holds "/". The match is exact, case included.
 */
export function isInStorageFolder(path: string, ...folder: string[]): boolean {
	if (
		folder.length === 0 ||
		folder.some((segment) => segment.includes("/") || !isSafeSegment(segment))
	) {
		return false;
	}
	return (
		isSafeStorageObjectPath(path) && path.startsWith(`${folder.join("/")}/`)
	);
}
