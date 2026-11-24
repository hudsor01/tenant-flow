/**
 * Signup names, and the public.users rows that deleted auth users left behind
 * (migration 20261124215400).
 *
 * The SQL runs only in Postgres, so this reads it as text and pins the parts
 * that would do harm if they drifted: the backfill must never put a name back
 * on a GDPR-anonymized row, the signup trigger may remove only a row whose auth
 * user no longer exists, the one-off cleanup is capped, and the new helper is
 * not callable from the API. The trigger itself was exercised against
 * production on 2026-11-24 inside a rolled-back block: a re-signup over a
 * leftover row succeeded, and both the email-form and the Google name shapes
 * came out as first, last and full name.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
	"supabase/migrations/20261124215400_signup_names_and_orphan_users.sql",
	"utf8",
);

function section(from: string, to: string): string {
	const start = sql.indexOf(from);
	const end = sql.indexOf(to, start);
	expect(start).toBeGreaterThan(-1);
	expect(end).toBeGreaterThan(start);
	return sql.slice(start, end);
}

describe("signup names migration", () => {
	it("keeps the name helper off the API", () => {
		expect(sql).toContain(
			"revoke all on function public.auth_metadata_names(jsonb, text) from public, anon, authenticated;",
		);
	});

	it("reads the email form's first and last name, then Google's full name", () => {
		const helper = section(
			"create or replace function public.auth_metadata_names",
			"revoke all on function",
		);
		expect(helper).toContain("v_meta ->> 'first_name'");
		expect(helper).toContain("v_meta ->> 'last_name'");
		expect(helper).toContain("v_meta ->> 'full_name'");
		expect(helper).toContain("v_meta ->> 'given_name'");
		expect(helper).toContain("v_meta ->> 'family_name'");
		// An email address is never taken for a name.
		expect(helper).toContain("position('@' in v_name) > 0");
	});

	it("lets the trigger remove only a same-email row whose auth user is gone", () => {
		const trigger = section(
			"create or replace function public.ensure_public_user_for_auth",
			"-- Backfill",
		);
		expect(trigger).toMatch(
			/delete from public\.users as stale\s+where lower\(stale\.email\) = lower\(resolved_email\)\s+and stale\.id <> new\.id\s+and not exists \(select 1 from auth\.users as a where a\.id = stale\.id\);/,
		);
		// An existing name is never replaced on a conflicting insert.
		expect(trigger).toContain(
			"first_name = coalesce(u.first_name, excluded.first_name)",
		);
		expect(trigger).toContain(
			"last_name = coalesce(u.last_name, excluded.last_name)",
		);
	});

	it("never backfills a name onto an anonymized row, or over one an owner set", () => {
		const backfill = section("update public.users as u", "do $$");
		expect(backfill).toContain("u.status <> 'inactive'");
		expect(backfill).toContain("u.full_name <> '[deleted user]'");
		expect(backfill).toContain("u.email not like '[deleted-%'");
		expect(backfill).toContain(
			"first_name = coalesce(u.first_name, n.first_name)",
		);
		expect(backfill).toContain(
			"last_name = coalesce(u.last_name, n.last_name)",
		);
	});

	it("caps the one-off cleanup at the rows counted before it ran", () => {
		const cleanup = sql.slice(sql.indexOf("do $$"));
		expect(cleanup).toContain("if v_orphans > 25 then");
		expect(cleanup).toMatch(
			/delete from public\.users as u\s+where not exists \(select 1 from auth\.users as a where a\.id = u\.id\);/,
		);
	});
});
