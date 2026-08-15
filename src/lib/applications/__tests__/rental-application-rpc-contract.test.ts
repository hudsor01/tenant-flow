/**
 * The four rental-application RPCs that plan 66-04 shipped with defects, pinned
 * against the definition that is actually in force.
 *
 * WHAT THIS FILE CAN AND CANNOT DECIDE. It reads SQL text off disk. It cannot
 * execute a statement, so it cannot tell you that two concurrent
 * `create_application_link` calls really do serialize, that `'2026-02-31'::date`
 * really is caught, that a converted row really loses its decline reason, or
 * that a soft-deleted unit really does close its public link. There is NO
 * PostgreSQL in this repo's test environment and no way to fake one honestly, so
 * every SQL claim here is a claim about the text a fresh database will end up
 * executing and nothing more. The behavioural half of F1 needs the migration
 * applied, which is an owner-gated step; the same split is why
 * `apply-token-contract.test.ts` reads the Edge Function's source rather than
 * importing it, and why `inspections.test.ts` reads a CHECK constraint out of
 * its migration.
 *
 * WHAT IT DOES DECIDE, AND WHY THAT IS WORTH HAVING. Every assertion below runs
 * against the LAST `create or replace` of each function across the whole
 * migration directory in timestamp order — the definition a fresh database ends
 * up with. So it fails if the corrections are reverted, if the migration
 * carrying them is deleted, AND if some later migration replaces one of these
 * functions with a body that has lost them. A test written against one named
 * file would catch only the first of those three.
 *
 * The F6 correction also has a genuine behavioural regression test on the
 * reachable path: `apply-token` is the RPC's only caller, and
 * `application-guards.test.ts` now rejects six calendar-impossible dates that
 * the shape regex accepted.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = "supabase/migrations";

/** Every migration, in the order Postgres will apply them. */
function migrationFiles(): string[] {
	return readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith(".sql"))
		.sort();
}

/**
 * The body of the LAST `create or replace function public.<name>(` in migration
 * order, delimiters included.
 *
 * Throws rather than returning an empty string when the function is not
 * declared anywhere: an assertion made against "" passes every `not.toContain`
 * in this file, which is the vacuous shape these tests exist to avoid.
 */
function effectiveDefinition(functionName: string): string {
	const marker = `create or replace function public.${functionName}(`;
	let found: string | null = null;

	for (const file of migrationFiles()) {
		const source = readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8");
		let from = 0;
		for (;;) {
			const start = source.indexOf(marker, from);
			if (start === -1) break;
			const end = source.indexOf("\n$function$;", start);
			if (end === -1) {
				throw new Error(
					`${file}: \`${functionName}\` is not closed by $function$; — the parser, not the source, may be wrong. Do not loosen it to make a test pass.`,
				);
			}
			found = source.slice(start, end + "\n$function$;".length);
			from = end;
		}
	}

	if (found === null) {
		throw new Error(
			`No migration declares public.${functionName} — it may have been renamed or removed.`,
		);
	}
	return found;
}

/** SQL line comments stripped, so ordering claims run against code alone. */
function stripComments(sql: string): string {
	return sql.replace(/^[ \t]*--.*$/gm, "");
}

describe("the parser is not vacuous", () => {
	it("finds a real body and strips only the prose", () => {
		const definition = effectiveDefinition("create_application_link");
		expect(definition).toContain("extensions.gen_random_bytes(32)");
		expect(definition.endsWith("$function$;")).toBe(true);

		expect(definition).toContain("-- ");
		expect(stripComments(definition)).not.toContain("-- ");
		expect(stripComments(definition)).toContain("insert into");
	});

	it("throws for a function nothing declares", () => {
		expect(() => effectiveDefinition("no_such_function")).toThrow();
	});

	it("resolves to the LAST definition, not the first", () => {
		// The corrections ship in their own migration on top of an APPLIED one, so
		// every function below is declared twice. If this resolved to the first
		// occurrence, all three suites underneath would be testing the defect.
		const declaringFiles = migrationFiles().filter((file) =>
			readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8").includes(
				"create or replace function public.record_application_conversion(",
			),
		);
		expect(declaringFiles.length).toBeGreaterThanOrEqual(2);
		expect(effectiveDefinition("record_application_conversion")).toContain(
			"disposition_reason = null",
		);
	});
});

/**
 * The closed reason vocabulary the two public-boundary functions share
 * (20260807003555 header, section 4). F1's fix has to live INSIDE this set: the
 * uniform failure shape is the control, and a caller that could tell "the unit
 * was removed" apart from "that token never existed" learns both that the token
 * is real and which listing it belonged to (T-66-01/T-66-02).
 */
const PUBLIC_REASONS = [
	"invalid_token",
	"expired_token",
	"revoked_token",
	"link_capped",
	"rate_capped",
	"invalid_payload",
	"duplicate",
];

/** Every `'...'::text` reason literal a function can return. */
function reasonLiterals(code: string): string[] {
	return (code.match(/'([a-z_]+)'::text/g) ?? []).map((raw) =>
		raw.slice(1, raw.indexOf("'", 1)),
	);
}

/**
 * F1. A SOFT-DELETED UNIT LEFT ITS PUBLIC LINK LIVE.
 *
 * `rental_application_links.unit_id` is `on delete cascade` and the schema
 * justified that with "units are hard-deletable". They are not: both deletes in
 * this product write `status = 'inactive'` and leave the row in place
 * (`unitMutations.delete`, `propertyMutations.delete`), so the cascade never
 * fires and no trigger on `public.units` touches links either. Neither RPC
 * carried a status predicate, so an owner who rented the unit and removed it
 * kept a link that answered valid=true with the property name and the rent, kept
 * accepting applicant PII and kept notifying them, for the rest of the 60 days.
 */
describe("a removed unit closes its public link", () => {
	const contextDefinition = effectiveDefinition("get_application_context");
	const contextCode = stripComments(contextDefinition);
	const submitCode = stripComments(
		effectiveDefinition("submit_rental_application"),
	);

	it("gates the listing lookup on BOTH statuses in get_application_context", () => {
		const selectIndex = contextCode.indexOf("from public.units un");
		const notFoundIndex = contextCode.indexOf("if not found", selectIndex);

		// Positive controls: the lookup and its failure branch both exist, so the
		// containment claims below are made against a real statement.
		expect(selectIndex).toBeGreaterThan(-1);
		expect(notFoundIndex).toBeGreaterThan(selectIndex);

		// The predicates must be part of THAT select, not merely present somewhere
		// in the function — a status check after the row has already been returned
		// would change nothing.
		const statement = contextCode.slice(selectIndex, notFoundIndex);
		expect(statement).toContain("un.status is distinct from 'inactive'");
		expect(statement).toContain("pr.status is distinct from 'inactive'");
	});

	it("refuses a removed unit BEFORE the caps in submit_rental_application", () => {
		const lockIndex = submitCode.indexOf("for update;");
		const gateIndex = submitCode.indexOf(
			"un.status is distinct from 'inactive'",
		);
		const capIndex = submitCode.indexOf("v_link.submission_count >= 250");

		// All three anchors first: an ordering assertion over a missing index is
		// satisfied trivially at -1, which is the vacuous shape this file exists to
		// avoid.
		expect(lockIndex).toBeGreaterThan(-1);
		expect(gateIndex).toBeGreaterThan(-1);
		expect(capIndex).toBeGreaterThan(-1);

		// Under the link row's own lock, and ahead of every cap read.
		expect(lockIndex).toBeLessThan(gateIndex);
		expect(gateIndex).toBeLessThan(capIndex);

		// The property half travels with it, because deleting a property soft-deletes
		// the property row and leaves its units untouched.
		const gate = submitCode.slice(gateIndex - 400, capIndex);
		expect(gate).toContain("pr.status is distinct from 'inactive'");
		expect(gate).toContain("'invalid_token'::text");
	});

	it("keeps the label snapshot a left join, so no submission is discarded", () => {
		// The gate above decides whether the link may be used. The snapshot 100
		// lines below only decides what goes into property_label, and tightening it
		// into an inner join would silently drop a submission whenever a property
		// row was unreachable — which is a strictly worse failure than the one F1
		// fixes. Both facts have to hold at once.
		const snapshotIndex = submitCode.indexOf(
			"left join public.properties pr on pr.id = un.property_id",
		);
		const gateIndex = submitCode.indexOf(
			"un.status is distinct from 'inactive'",
		);

		// BOTH anchors are asserted present before the ordering claim. Without the
		// gate assertion this test passes on the DEFECTIVE source: `gateIndex` is
		// -1 there and every index beats -1, so "the snapshot comes after the gate"
		// would hold in a function that has no gate at all.
		expect(snapshotIndex).toBeGreaterThan(-1);
		expect(gateIndex).toBeGreaterThan(-1);
		expect(snapshotIndex).toBeGreaterThan(gateIndex);
		expect(submitCode).toContain("coalesce(v_ctx.property_name, 'Property')");
	});

	it("adds no new reason code to either public-boundary function", () => {
		const context = reasonLiterals(contextCode);
		const submit = reasonLiterals(submitCode);

		// Positive control: the extractor really finds literals, so the subset
		// assertions below are not passing over two empty arrays.
		expect(context).toContain("invalid_token");
		expect(submit).toContain("invalid_token");

		for (const reason of [...context, ...submit]) {
			expect(PUBLIC_REASONS).toContain(reason);
		}
	});

	it("no longer claims units are hard-deletable", () => {
		// The false premise is what made the cascade look sufficient. Left in place
		// it persuades the next reader that the link goes away on its own.
		const submitDefinition = effectiveDefinition("submit_rental_application");
		expect(submitDefinition).not.toContain("units are hard-deletable");
		// Positive control: the comments really did survive into `definition`, so
		// the absence above is a claim about the wording and not about a stripped
		// string.
		expect(submitDefinition).toContain("Denormalized label snapshot");
	});
});

/**
 * F7. The one-active-link guard was a bare `if exists (...)` with no row lock,
 * no advisory lock and no backing partial unique index. Under READ COMMITTED —
 * the default — two concurrent calls both evaluate it against a snapshot in
 * which the other's row is not yet visible, both pass, and both insert.
 *
 * A unit then has two active links. The panel renders only the newest, so the
 * owner revokes the visible one believing the listing is closed while the hidden
 * one keeps accepting applications.
 */
describe("create_application_link serializes its one-active-link guard", () => {
	const definition = effectiveDefinition("create_application_link");
	const code = stripComments(definition);

	it("takes a per-unit advisory lock BEFORE the guard reads", () => {
		const lockIndex = code.indexOf("pg_advisory_xact_lock(");
		const guardIndex = code.indexOf("from public.rental_application_links");

		// Both halves must exist before the ordering claim means anything: an
		// ordering assertion over a missing index passes trivially at -1.
		expect(lockIndex).toBeGreaterThan(-1);
		expect(guardIndex).toBeGreaterThan(-1);
		// Order is the whole point. A lock taken after the read is not a lock.
		expect(lockIndex).toBeLessThan(guardIndex);
	});

	it("keys the lock on the unit, so unrelated units never queue", () => {
		expect(code).toContain("hashtextextended(p_unit_id::text, 0)");
	});

	it("no longer claims the bare exists() is a race guard", () => {
		// The comment asserted the check "doubles as the double-click and race
		// guard". It never did, for exactly the reason submit_rental_application
		// takes FOR UPDATE before evaluating its caps. A wrong comment on a
		// concurrency claim is how the next reader decides not to look.
		expect(definition).not.toContain("double-click and race guard");
		// Positive control: the comments really did survive into `definition`, so
		// the absence above is a claim about the wording rather than about a
		// stripped string.
		expect(definition).toContain("one active link per unit");
	});
});

/**
 * F6. `desired_move_in_date` was shape-checked with `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`
 * and then cast `::date`. `2026-02-31`, `2024-13-01` and `0000-01-01` all satisfy
 * that regex and every one raises 22008 on the cast, aborting the WHOLE
 * transaction — so apply-token answers 500 and the applicant loses all 26 fields.
 * That is the abort the validation block's own header says it exists to prevent.
 */
describe("submit_rental_application answers a bad date instead of raising", () => {
	const code = stripComments(effectiveDefinition("submit_rental_application"));
	const castIndex = code.indexOf("v_move_in := v_scratch::date;");

	it("still shape-checks the date before touching the cast", () => {
		const regexIndex = code.indexOf("'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'");
		expect(regexIndex).toBeGreaterThan(-1);
		expect(castIndex).toBeGreaterThan(-1);
		expect(regexIndex).toBeLessThan(castIndex);
	});

	it("runs the cast inside a subtransaction with a handler", () => {
		// The `begin` that opens the block, and the `exception` that closes it,
		// must sit either side of the cast — not merely exist somewhere in a
		// 350-line function.
		const openIndex = code.lastIndexOf("\n  begin\n", castIndex);
		const handlerIndex = code.indexOf("\n  exception\n", castIndex);
		expect(openIndex).toBeGreaterThan(-1);
		expect(handlerIndex).toBeGreaterThan(-1);
		expect(openIndex).toBeLessThan(castIndex);
		expect(handlerIndex).toBeGreaterThan(castIndex);

		const block = code.slice(openIndex, handlerIndex + 400);
		expect(block).toContain("when others then");
		expect(block).toContain("v_move_in := null;");
	});

	it("turns a caught cast into the ordinary invalid_payload answer", () => {
		const after = code.slice(castIndex);
		const guardIndex = after.indexOf("if v_move_in is null then");
		expect(guardIndex).toBeGreaterThan(-1);
		// The branch answers rather than raises, like every other validation
		// failure in this function.
		expect(after.slice(guardIndex, guardIndex + 200)).toContain(
			"'invalid_payload'::text",
		);
		expect(after.slice(guardIndex, guardIndex + 200)).not.toContain("raise");
	});

	it("keeps the link row locked FOR UPDATE ahead of all of it", () => {
		// Positive control for the whole file, and a real invariant: the fail-closed
		// cap is only fail-closed under that lock (D-04a, F-6).
		const lockIndex = code.indexOf("for update;");
		expect(lockIndex).toBeGreaterThan(-1);
		expect(lockIndex).toBeLessThan(castIndex);
	});
});

/**
 * F8. `record_application_conversion` wrote `status = 'approved'` and left
 * `disposition_reason` alone, so an application declined and later converted
 * persisted as approved-carrying-a-decline-reason — a state
 * `set_application_status` treats as impossible. The retention sweep RETAINS
 * both columns on the anonymized stub, so the contradiction became the permanent
 * record of the decision.
 */
describe("record_application_conversion leaves no decline reason behind", () => {
	const code = stripComments(
		effectiveDefinition("record_application_conversion"),
	);

	it("clears disposition_reason in the SAME update that approves the row", () => {
		const updateIndex = code.indexOf("update public.rental_applications");
		expect(updateIndex).toBeGreaterThan(-1);
		const statement = code.slice(updateIndex, code.indexOf(";", updateIndex));

		// Positive control: this really is the approving UPDATE.
		expect(statement).toContain("status = 'approved'");
		expect(statement).toContain("converted_tenant_id = p_tenant_id");
		expect(statement).toContain("disposition_reason = null");
	});

	it("agrees with set_application_status, which clears it on every path", () => {
		// The invariant, stated where both writers can be compared. This is also
		// the positive control for the assertion above: it proves the parser can
		// see such a clause in a function that always had one.
		const statusCode = stripComments(
			effectiveDefinition("set_application_status"),
		);
		const clauses = statusCode.match(/disposition_reason = [^,\n]+/g) ?? [];
		expect(clauses.length).toBeGreaterThanOrEqual(2);
		for (const clause of clauses) {
			expect(clause).toMatch(/null|case when p_status = 'rejected'/);
		}
	});
});
