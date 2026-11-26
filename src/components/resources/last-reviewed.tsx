import { formatDate } from "#lib/formatters/date";

/**
 * "Last reviewed November 25, 2026" under a resource's H1 (2026-11-24 SEO
 * audit M3, X9, D4): the date its facts were last checked, the same date
 * its JSON-LD gives as `dateModified`.
 */
export function LastReviewed({
	reviewedAt,
	suffix,
}: {
	/** YYYY-MM-DD. */
	reviewedAt: string;
	/** Text after the date, e.g. " for tax year 2026". */
	suffix?: string;
}) {
	return (
		<p className="mt-3 mb-0 text-sm text-muted-foreground">
			Last reviewed{suffix ?? ""} on{" "}
			<time dateTime={reviewedAt}>
				{formatDate(reviewedAt, { style: "long" })}
			</time>
		</p>
	);
}
