/**
 * Signup names, and the public.users rows that deleted auth users left behind
 * (migration 20261124215400).
 *
 * The SQL runs only in Postgres, so this reads it as text and pins the parts
 * that would do harm if they drifted: the backfill must never put a name back
 * on a GDPR-anonymized row, the signup trigger may remove only a row whose auth
 * user no longer exists, the one-off cleanup is capped, and the new helper is
 * not callable from the API. 20261124215838 then narrowed the trigger's delete
 * to a leftover row holding no owner data and no Stripe link, because a signup
 * needs no confirmed email and the delete cascades.
 *
 * Both were exercised against production on 2026-11-24 inside rolled-back
 * blocks: a re-signup over a bare leftover row succeeded, with the email-form
 * and Google name shapes coming out as first, last and full name; a leftover
 * row with a Stripe customer, and one owning a tenant, were kept and their
 * re-signup was refused.
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

describe("signup trigger keeps a leftover row that holds data", () => {
	const narrowed = readFileSync(
		"supabase/migrations/20261124215838_signup_trigger_keep_owner_data.sql",
		"utf8",
	);
	const trigger = narrowed.slice(
		narrowed.indexOf(
			"create or replace function public.ensure_public_user_for_auth",
		),
	);
	const removal = trigger.slice(
		trigger.indexOf("delete from public.users as stale"),
		trigger.indexOf("insert into public.users"),
	);

	it("removes only a row whose auth user is gone", () => {
		expect(removal).toContain(
			"not exists (select 1 from auth.users as a where a.id = stale.id)",
		);
	});

	it("keeps a row with a Stripe customer or subscription", () => {
		expect(removal).toContain("stale.stripe_customer_id is null");
		expect(removal).toContain("stale.subscription_id is null");
	});

	it("keeps a row that owns anything an owner creates", () => {
		for (const [table, column] of [
			["properties", "owner_user_id"],
			["units", "owner_user_id"],
			["tenants", "owner_user_id"],
			["leases", "owner_user_id"],
			["maintenance_requests", "owner_user_id"],
			["inspections", "owner_user_id"],
			["reports", "owner_user_id"],
			["document_template_definitions", "owner_user_id"],
			["esign_events", "owner_user_id"],
			["rent_charges", "owner_user_id"],
			["rent_receipts", "owner_user_id"],
			["rental_applications", "owner_user_id"],
			["rental_application_links", "owner_user_id"],
			["lease_signing_tokens", "created_by"],
		]) {
			expect(removal).toContain(
				`not exists (select 1 from public.${table} as t where t.${column} = stale.id)`,
			);
		}
	});

	it("is the trigger body the first migration replaced, plus the guards", () => {
		const first = sql.slice(
			sql.indexOf(
				"create or replace function public.ensure_public_user_for_auth",
			),
			sql.indexOf("-- Backfill"),
		);
		const firstInsert = first.slice(first.indexOf("insert into public.users"));
		expect(trigger).toContain(firstInsert.trim());
	});
});
