/**
 * Fetch the owner's data export from `export-user-data` and save it.
 *
 * Shared by the Settings "My Data" section (`AccountDataSection`) and the
 * inline GDPR actions, which each carried a copy of this fetch plus a
 * hand-rolled anchor download that revoked the object URL immediately after
 * `click()`. The save now goes
 * through `downloadBlob`, which defers the revoke so the browser can start the
 * download first.
 */

import { downloadBlob } from "#lib/reports/download-blob";
import { createClient } from "#lib/supabase/client";

/**
 * The name export-user-data sends in its `Content-Disposition` (UTC date).
 * The client cannot READ that header: the function is cross-origin and
 * `_shared/cors.ts` sends no `Access-Control-Expose-Headers`, so
 * `response.headers.get("Content-Disposition")` is always null in a browser.
 */
export function accountDataExportFilename(now: Date = new Date()): string {
	return `tenantflow-data-export-${now.toISOString().slice(0, 10)}.json`;
}

function errorFromBody(body: unknown): string | null {
	if (
		typeof body === "object" &&
		body !== null &&
		"error" in body &&
		typeof body.error === "string" &&
		body.error !== ""
	) {
		return body.error;
	}
	return null;
}

export async function downloadAccountData(): Promise<void> {
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.access_token) throw new Error("Not authenticated");

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(`${supabaseUrl}/functions/v1/export-user-data`, {
		method: "GET",
		headers: { Authorization: `Bearer ${session.access_token}` },
	});

	if (!response.ok) {
		const body: unknown = await response.json().catch(() => null);
		throw new Error(errorFromBody(body) ?? "Export failed");
	}

	downloadBlob(await response.blob(), accountDataExportFilename());
}
