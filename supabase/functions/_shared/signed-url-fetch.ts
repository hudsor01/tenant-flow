// Signed Storage URLs: picking the usable ones out of a createSignedUrls
// result, and fetching one without throwing. Keep this file import-free and
// Deno-free: tsc compiles it for the Vitest tests under
// supabase/functions/__tests__/.

/** One entry of a storage-js `createSignedUrls` result. */
export interface SignedUrlEntry {
	path: string | null;
	signedUrl: string | null;
	error: string | null;
}

/**
 * Maps each path Storage signed to its URL. An entry Storage refused (it
 * carries an `error`, or no path or URL) is left out, and so is a URL whose
 * origin is not `storageOrigin`, so nothing is fetched from any host but this
 * project's own.
 */
export function signedUrlsByPath(
	entries: readonly SignedUrlEntry[],
	storageOrigin: string,
): Map<string, string> {
	const urls = new Map<string, string>();
	for (const entry of entries) {
		if (entry.error || !entry.path || !entry.signedUrl) continue;
		let origin: string;
		try {
			origin = new URL(entry.signedUrl).origin;
		} catch {
			continue;
		}
		if (origin === storageOrigin) urls.set(entry.path, entry.signedUrl);
	}
	return urls;
}

export type SignedObjectResult =
	| { blob: Blob; error: null }
	| { blob: null; error: string };

/**
 * Fetches one signed URL and resolves with the body or the reason it failed
 * (`http_<status>` for a non-2xx answer), never throwing, so one unreadable
 * object cannot end a batch.
 */
export async function fetchSignedObject(
	url: string,
	fetchImpl: typeof fetch = fetch,
): Promise<SignedObjectResult> {
	try {
		const res = await fetchImpl(url);
		if (!res.ok) {
			await res.body?.cancel();
			return { blob: null, error: `http_${res.status}` };
		}
		return { blob: await res.blob(), error: null };
	} catch (err) {
		return {
			blob: null,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
