/**
 * The body a mocked `user_tour_progress` write is answered with.
 *
 * `updateTourProgress` (`src/hooks/api/use-tour-progress.ts`) upserts with
 * `.select(<columns>).single()`, so PostgREST answers 201 with the written
 * row's selected columns as one JSON object. postgrest-js reads an empty body
 * as `data: null`, so the empty 201 the sidebar spec sent made `data.tour_key`
 * throw in the client: every answered write failed there, and an in-progress
 * one rejected (66.2-39 cycle 3, G49). This builds the object PostgREST would
 * send, from the request's `select` parameter and its body; a column the body
 * does not carry is null, as an unset nullable column reads.
 */
export function tourProgressWriteBody(url: string, written: unknown): string {
	const columns = (new URL(url).searchParams.get("select") ?? "")
		.split(",")
		.map((column) => column.trim())
		.filter((column) => column !== "");
	const row = new Map<string, unknown>(
		typeof written === "object" && written !== null && !Array.isArray(written)
			? Object.entries(written)
			: [],
	);
	return JSON.stringify(
		Object.fromEntries(
			columns.map((column) => [column, row.get(column) ?? null]),
		),
	);
}
