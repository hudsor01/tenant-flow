/**
 * Human-readable byte sizes. Kept minimal so the same rules apply in every
 * dialog that shows file size — upload cards, document vault rows, bulk
 * import validate step.
 *
 * Returns `—` for `null`/`undefined`, but `0 B` for a real zero-byte file
 * so the caller can distinguish "unknown size" from a broken upload.
 *
 * Each crossover branches on the *rounded* value of the smaller unit, not the
 * raw value, so a byte count that would round-up to 1024 of a unit (e.g.
 * 1,047,554 bytes → 1024 KB) flips to the next unit instead of displaying
 * "1024 KB" — which would contradict the intent of the `< 1024` boundary. The
 * same rounded-boundary rule applies at the MB→GB crossover: storage quotas
 * are measured in GB (METER-03), so a multi-GB value must render as GB, never
 * as a four-digit MB string ("5120.0 MB").
 */

const KB = 1024;
const MB = KB * KB;
const GB = KB * KB * KB;

export function formatBytes(bytes: number | null | undefined): string {
	if (bytes === null || bytes === undefined) return "—";
	if (bytes === 0) return "0 B";
	if (bytes < KB) return `${bytes} B`;
	const roundedKb = Math.round(bytes / KB);
	if (roundedKb < KB) return `${roundedKb} KB`;
	const roundedMb = Math.round(bytes / MB);
	if (roundedMb < KB) return `${(bytes / MB).toFixed(1)} MB`;
	return `${(bytes / GB).toFixed(1)} GB`;
}
