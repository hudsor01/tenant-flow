/**
 * Human-readable byte sizes. Kept minimal so the same rules apply in every
 * dialog that shows file size — upload cards, document vault rows, bulk
 * import validate step.
 *
 * Returns `—` for `null`/`undefined`, but `0 B` for a real zero-byte file
 * so the caller can distinguish "unknown size" from a broken upload.
 */

export function formatBytes(bytes: number | null | undefined): string {
	if (bytes === null || bytes === undefined) return '\u2014'
	if (bytes === 0) return '0 B'
	const kb = bytes / 1024
	if (kb < 1) return `${bytes} B`
	if (kb < 1024) return `${kb.toFixed(0)} KB`
	return `${(kb / 1024).toFixed(1)} MB`
}
