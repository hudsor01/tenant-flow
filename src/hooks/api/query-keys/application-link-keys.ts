/**
 * Application-link query keys, options, the typed boundary mapper and the two
 * link mutations (Phase 66 — APPLY-01, UI-SPEC §C).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). Split from `application-keys.ts`
 * because these are a different table with a different lifecycle; import from
 * whichever file defines the symbol you need.
 *
 * D-01/D-03a: ONE reusable link per unit, and the raw token is stored in an
 * owner-readable column so the owner can re-copy the listing URL for the life of
 * the link. `rental_application_links` has a SELECT policy and nothing else — no
 * INSERT, UPDATE or DELETE policy for any role — so creation and revocation are
 * the two owner-gated SECURITY DEFINER RPCs from plan 66-04 and there is no
 * PostgREST write path to fall back on.
 *
 * `token_hash` is deliberately NOT selected. It is the unauthenticated lookup
 * key and no owner surface renders it.
 */

import {
	mutationOptions,
	type QueryClient,
	queryOptions,
} from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import type { Database } from "#types/supabase";
import { mutationKeys } from "../mutation-keys";
import { ownerDashboardKeys } from "./owner-dashboard-keys";

/**
 * Derived from the generated table Row (CLAUDE.md rule 3) minus `owner_user_id`,
 * `created_by` and `token_hash`, none of which the panel reads.
 */
export type ApplicationLinkRow = Pick<
	Database["public"]["Tables"]["rental_application_links"]["Row"],
	| "id"
	| "unit_id"
	| "raw_token"
	| "expires_at"
	| "revoked_at"
	| "submission_count"
	| "created_at"
>;

/** The three columns `create_application_link` returns. */
export interface CreatedApplicationLink {
	link_id: string;
	raw_token: string;
	expires_at: string;
}

export type ApplicationLinkState = "none" | "active" | "expired" | "revoked";

const LINK_SELECT_COLUMNS =
	"id,unit_id,raw_token,expires_at,revoked_at,submission_count,created_at";

/**
 * D-03. A listing runs for weeks, so `/sign`'s short window is wrong here and an
 * unbounded link is worse than either — it turns a link nobody remembers into a
 * permanent public write surface. The RPC clamps whatever it receives to
 * [1, 365]; UI-SPEC §C offers the owner no expiry control, so this is the only
 * value the client ever sends.
 */
export const DEFAULT_LINK_EXPIRY_DAYS = 60;

/**
 * The panel renders one row per UNIT, not per link, and a realistic owner has
 * tens of units. 200 bounds the query (CLAUDE.md: every list query is bounded)
 * without truncating anything the UI shows.
 */
const LINK_LIST_LIMIT = 200;

function requireString(
	raw: Record<string, unknown>,
	field: string,
	mapper: string,
): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new Error(
			`${mapper}: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}

/**
 * Typed PostgREST boundary, same idiom as `mapDocumentRow`. `submission_count`
 * is coerced rather than trusted: it is the number the cap banner reads, and a
 * string here would compare wrong against the numeric cap.
 */
export function mapApplicationLinkRow(
	raw: Record<string, unknown>,
): ApplicationLinkRow {
	const mapper = "mapApplicationLinkRow";
	const rawCount = raw.submission_count;
	const submission_count =
		typeof rawCount === "number"
			? rawCount
			: typeof rawCount === "string" && rawCount.trim() !== ""
				? Number(rawCount)
				: Number.NaN;
	if (!Number.isFinite(submission_count)) {
		throw new Error(
			`${mapper}: NOT NULL field 'submission_count' missing or non-numeric from PostgREST response`,
		);
	}

	const revoked_at = raw.revoked_at;
	return {
		id: requireString(raw, "id", mapper),
		unit_id: requireString(raw, "unit_id", mapper),
		raw_token: requireString(raw, "raw_token", mapper),
		expires_at: requireString(raw, "expires_at", mapper),
		// The one nullable column: null means "still live", and that null is what
		// `applicationLinkState` keys the revoked branch on.
		revoked_at: typeof revoked_at === "string" ? revoked_at : null,
		submission_count,
		created_at: requireString(raw, "created_at", mapper),
	};
}

/**
 * The four states UI-SPEC §C renders, derived in ONE place so the chip, the
 * control block and the expiry line cannot disagree.
 *
 * REVOKED IS CHECKED BEFORE EXPIRED, and the order is load-bearing. A link can
 * be both — an owner revokes on Tuesday and the 60 days lapse in September — and
 * an expiry-first implementation labels it "Expired", hiding from the owner that
 * they took the link down deliberately. Revoked is the more specific and more
 * actionable fact, so it wins.
 *
 * The `<=` boundary matches the server: `create_application_link` treats a link
 * as active only while `expires_at > now()`, and `submit_rental_application`
 * rejects on `expires_at <= now()`. A client that says "active" at the exact
 * boundary renders a copy button for a link the server already refuses.
 */
export function applicationLinkState(
	row: ApplicationLinkRow | null,
	now: Date,
): ApplicationLinkState {
	if (!row) return "none";
	if (row.revoked_at !== null) return "revoked";
	const expiresAt = Date.parse(row.expires_at);
	// An unparseable timestamp fails closed: better to offer "Create a new link"
	// than to hand the owner a URL the server will reject.
	if (Number.isNaN(expiresAt)) return "expired";
	return expiresAt <= now.getTime() ? "expired" : "active";
}

/**
 * The copyable listing URL, built from `NEXT_PUBLIC_APP_URL` and NEVER from the
 * browser's current origin (66-RESEARCH Pitfall 1). The gate on this file is a
 * zero-occurrence grep for that browser global, so it is named nowhere here —
 * not even in prose.
 *
 * The submit Edge Function's CORS check is an exact string comparison against
 * `NEXT_PUBLIC_APP_URL`. An owner who opens the dashboard on a `www.` or preview
 * host and copies an origin-derived URL publishes a link that works fine when
 * they test it and fails CORS for every applicant, with no server-side error to
 * find — the fetch never completes.
 *
 * The trailing slash is trimmed because the same env var is compared verbatim on
 * the server, and `https://host//apply/token` is a different origin path than
 * the one the owner expects to paste.
 */
export function applicationLinkUrl(rawToken: string): string {
	const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
	return `${base}/apply/${rawToken}`;
}

export const applicationLinkKeys = {
	all: ["application-links"] as const,
	byUnit: () => [...applicationLinkKeys.all, "by-unit"] as const,
};

export const applicationLinkQueries = {
	/**
	 * Every link the owner holds, newest first. The panel groups them by
	 * `unit_id` client-side and renders one row per unit, so a single bounded
	 * read backs the whole band rather than one query per unit.
	 */
	byUnit: () =>
		queryOptions({
			queryKey: applicationLinkKeys.byUnit(),
			queryFn: async (): Promise<ApplicationLinkRow[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("rental_application_links")
					.select(LINK_SELECT_COLUMNS)
					.order("created_at", { ascending: false })
					.limit(LINK_LIST_LIMIT);

				if (error) handlePostgrestError(error, "application links");

				return ((data ?? []) as Record<string, unknown>[]).map(
					mapApplicationLinkRow,
				);
			},
		}),
};

/**
 * `create_application_link` (plan 66-04). Mints a 256-bit server-side token and
 * returns it once per creation; the raw value is also stored, so this is not a
 * shown-once secret and the owner can re-copy it from the panel afterwards.
 *
 * The RPC refuses while an ACTIVE link already exists for the unit, which is
 * what keeps "one link per unit" true and doubles as the double-click guard.
 * Expired and revoked links deliberately do not block, so "Create a new link"
 * works from both of those states.
 */
export function createApplicationLinkMutationOptions(queryClient: QueryClient) {
	return mutationOptions<CreatedApplicationLink, Error, { unitId: string }>({
		mutationKey: mutationKeys.applications.createLink,
		mutationFn: async ({ unitId }) => {
			const supabase = createClient();
			const { data, error } = await supabase.rpc("create_application_link", {
				p_unit_id: unitId,
				p_expires_days: DEFAULT_LINK_EXPIRY_DAYS,
			});
			if (error) handlePostgrestError(error, "application links");

			const row = data?.[0];
			if (!row) {
				throw new Error(
					"create_application_link returned no row from PostgREST response",
				);
			}
			const mapper = "createApplicationLink";
			const raw: Record<string, unknown> = { ...row };
			return {
				link_id: requireString(raw, "link_id", mapper),
				raw_token: requireString(raw, "raw_token", mapper),
				expires_at: requireString(raw, "expires_at", mapper),
			};
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: applicationLinkKeys.all,
			});
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
	});
}

/**
 * `revoke_application_link`. Stops the link accepting submissions; applications
 * already received are untouched, which is what the §C confirm dialog promises.
 */
export function revokeApplicationLinkMutationOptions(queryClient: QueryClient) {
	return mutationOptions<void, Error, { linkId: string }>({
		mutationKey: mutationKeys.applications.revokeLink,
		mutationFn: async ({ linkId }) => {
			const supabase = createClient();
			const { error } = await supabase.rpc("revoke_application_link", {
				p_link_id: linkId,
			});
			if (error) handlePostgrestError(error, "application links");
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: applicationLinkKeys.all,
			});
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
	});
}
