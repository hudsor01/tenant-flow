/**
 * Storage object paths, built and checked in one place.
 *
 * supabase-js puts an object path into the request URL unencoded for upload,
 * download and createSignedUrl, and the URL parser resolves "." and ".."
 * segments before the request leaves, percent-encoded ones ("%2e%2e")
 * included and with "\" read as "/". It also ends the path at "?" or "#" and
 * trims spaces from the end of the URL, so a final "..?x", "..#x" or ".. "
 * arrives as "..". A path holding such a segment moves the request out of its
 * bucket, or off Storage to another endpoint on the same host. A "/" inside an
 * id adds segments, which the storage RLS policies read as the entity type and
 * id.
 *
 * Build every upload path with `storageObjectPath`. Check every path read back
 * from the database before it reaches Storage: `isSafeStorageObjectPath` to
 * skip a bad path in a batch, `requireSafeStorageObjectPath` to fail a single
 * operation.
 *
 * Edge Functions cannot import src/, so `supabase/functions/_shared/
 * storage-path.ts` repeats `storageObjectPath` and `isSafeStorageObjectPath`;
 * `supabase/functions/__tests__/storage-path-parity.test.ts` runs one case
 * table through both.
 */

import { DiagnosticError } from "#lib/diagnostic-error";

const EXTENSION_RE = /^[a-z0-9]{1,10}$/;

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
 * The file's last extension, lowercased, when it is 1-10 ASCII letters or
 * digits; otherwise `fallback`. A dotfile's leading dot starts its name, not an
 * extension, so ".bashrc" has none.
 */
export function safeFileExtension(fileName: string, fallback: string): string {
	const dot = fileName.lastIndexOf(".");
	if (dot <= 0) return fallback;
	const extension = fileName.slice(dot + 1).toLowerCase();
	return EXTENSION_RE.test(extension) ? extension : fallback;
}

/**
 * Joins `segments` with "/". Throws when there are none, or when one is empty,
 * a dot segment, starts or ends with a space, or holds "/", "\", "?", "#" or a
 * control character, so a caller's id or file name can never add, drop or
 * climb a segment.
 */
export function storageObjectPath(...segments: string[]): string {
	if (segments.length === 0) {
		throw new DiagnosticError("storageObjectPath: no segments");
	}
	for (const [index, segment] of segments.entries()) {
		if (segment.includes("/") || !isSafeSegment(segment)) {
			throw new DiagnosticError(
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

/** Returns `path` when `isSafeStorageObjectPath` accepts it; throws otherwise. */
export function requireSafeStorageObjectPath(path: string): string {
	if (!isSafeStorageObjectPath(path)) {
		throw new DiagnosticError(
			"requireSafeStorageObjectPath: path failed the storage path check",
		);
	}
	return path;
}

/**
 * Replaces runs of characters that Storage, signed-URL generators or browsers
 * might reject in a key (path separators, URL metacharacters, whitespace) with
 * "_", keeping letters (non-ASCII included), digits and other punctuation.
 */
export function sanitizeStorageFileName(name: string): string {
	return name.replace(/[\\/?%*:|"<>#&\s]+/g, "_");
}
