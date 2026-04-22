/**
 * Human-readable byte sizes. Kept minimal so the same rules apply in every
 * dialog that shows file size — upload cards, document vault rows, bulk
 * import validate step.
 *
 * Returns `—` for `null`/`undefined`, but `0 B` for a real zero-byte file
 * so the caller can distinguish "unknown size" from a broken upload.
 *
 * The KB→MB crossover branches on the *rounded* KB value, not the raw
 * value, so a byte count that would round-up to 1024 KB (e.g. 1,047,554
 * bytes) flips to MB instead of displaying "1024 KB" — which would
 * contradict the intent of the `< 1024` boundary.
 */

const KB = 1024
const MB = KB * KB

export function formatBytes(bytes: number | null | undefined): string {
	if (bytes === null || bytes === undefined) return '\u2014'
	if (bytes === 0) return '0 B'
	if (bytes < KB) return `${bytes} B`
	const roundedKb = Math.round(bytes / KB)
	if (roundedKb < KB) return `${roundedKb} KB`
	return `${(bytes / MB).toFixed(1)} MB`
}
