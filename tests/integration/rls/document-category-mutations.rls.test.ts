/**
 * Integration tests for the v2.6 Phase 66 admin RPCs:
 *   - reassign_document_category(p_from_id, p_to_id)
 *   - reorder_document_categories(p_orders)
 *
 * Pins the contract:
 *   - Owner-scoped: ownerB cannot reassign or reorder ownerA's
 *     categories even if they hold the source/target ids.
 *   - Atomicity: reassign rewrites every documents.document_type AND
 *     deletes the source category in one transaction.
 *   - Default-protection: reassign refuses to delete an `is_default`
 *     category server-side (defense-in-depth — UI also disables).
 *   - Self-reference rejection: from === to → 22023.
 *   - Reorder fail-closed when any referenced category is foreign.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const PAYLOAD = "%PDF-1.4\n%%EOF";

describe("Phase 66 category mutation RPCs", () => {
	let clientA: SupabaseClient;
	let clientB: SupabaseClient;
	let ownerAId: string;
	let propertyA: { id: string } | null = null;
	const insertedDocIds: string[] = [];
	const uploadedPaths: string[] = [];
	const insertedCategoryIds: string[] = [];

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials();
		clientA = await createTestClient(ownerA.email, ownerA.password);
		clientB = await createTestClient(ownerB.email, ownerB.password);
		const {
			data: { user: uA },
		} = await clientA.auth.getUser();
		ownerAId = uA!.id;

		const { data: p } = await clientA
			.from("properties")
			.insert({
				name: "Phase-66 Mutation RPCs Property",
				address_line1: "1 Mutations St",
				city: "Testville",
				state: "CA",
				postal_code: "94105",
				country: "US",
				property_type: "APARTMENT",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		propertyA = p ? { id: p.id } : null;
		expect(propertyA).not.toBeNull();
	});

	afterAll(async () => {
		if (uploadedPaths.length > 0) {
			await clientA.storage
				.from("tenant-documents")
				.remove(uploadedPaths)
				.catch(() => {});
		}
		for (const id of insertedDocIds) {
			await clientA.from("documents").delete().eq("id", id);
		}
		// Idempotent cleanup — some category ids may already have been
		// deleted in-test by the reassign RPC. PostgREST DELETEs return
		// `{ error: null, data: [] }` on missing rows (no throw), so the
		// loop is naturally idempotent. The try/catch is belt-and-
		// suspenders against transient network errors so a single
		// failed cleanup doesn't abort the whole afterAll. Cycle-1 M-8.
		for (const id of insertedCategoryIds) {
			try {
				await clientA.from("document_categories").delete().eq("id", id);
			} catch {
				/* swallow — best-effort cleanup */
			}
		}
		if (propertyA)
			await clientA.from("properties").delete().eq("id", propertyA.id);
	});

	// Append a per-run suffix to slugs so re-runs against the same prod
	// account don't collide with rows that survived a previous failure
	// (the cleanup is idempotent but a mid-test crash skips it).
	const SLUG_SUFFIX = `_${Date.now().toString(36)}`;
	async function seedCategory(baseSlug: string, label: string) {
		const slug = `${baseSlug}${SLUG_SUFFIX}`.slice(0, 50);
		const { data, error } = await clientA
			.from("document_categories")
			.insert({
				owner_user_id: ownerAId,
				slug,
				label,
				sort_order: 999,
				is_default: false,
			})
			.select("id, slug")
			.single();
		expect(error).toBeNull();
		if (data) insertedCategoryIds.push(data.id);
		return data!;
	}

	async function seedDocument(documentType: string) {
		const ts = Date.now() + Math.floor(Math.random() * 1000);
		const path = `property/${propertyA!.id}/${ts}-rpc-test.pdf`;
		const { error: storageErr } = await clientA.storage
			.from("tenant-documents")
			.upload(path, new Blob([PAYLOAD], { type: "application/pdf" }), {
				contentType: "application/pdf",
			});
		expect(storageErr).toBeNull();
		uploadedPaths.push(path);
		const { data, error } = await clientA
			.from("documents")
			.insert({
				entity_type: "property",
				entity_id: propertyA!.id,
				document_type: documentType,
				mime_type: "application/pdf",
				file_path: path,
				storage_url: path,
				file_size: PAYLOAD.length,
				title: "Phase-66 doc fixture",
				owner_user_id: ownerAId,
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		if (data) insertedDocIds.push(data.id);
		return data!;
	}

	it("reassign_document_category: rewrites every matching document AND deletes the source row", async () => {
		const from = await seedCategory("phase66_reassign_from", "Reassign From");
		const to = await seedCategory("phase66_reassign_to", "Reassign To");
		const doc1 = await seedDocument(from.slug);
		const doc2 = await seedDocument(from.slug);

		const { error } = await clientA.rpc("reassign_document_category", {
			p_from_id: from.id,
			p_to_id: to.id,
		});
		expect(error).toBeNull();

		// Documents flipped to the target slug.
		const { data: updated } = await clientA
			.from("documents")
			.select("id, document_type")
			.in("id", [doc1.id, doc2.id]);
		expect(updated).toHaveLength(2);
		for (const d of (updated ?? []) as Array<{ document_type: string }>) {
			expect(d.document_type).toBe(to.slug);
		}

		// Source category gone.
		const { data: gone } = await clientA
			.from("document_categories")
			.select("id")
			.eq("id", from.id);
		expect(gone).toHaveLength(0);
	});

	it("reassign_document_category: refuses to delete an is_default category", async () => {
		// Find the seeded `other` default for ownerA.
		const { data: defaultRow } = await clientA
			.from("document_categories")
			.select("id, slug, is_default")
			.eq("slug", "other")
			.single();
		expect(defaultRow?.is_default).toBe(true);

		const target = await seedCategory(
			"phase66_default_protect_target",
			"Default Protect",
		);

		const { error } = await clientA.rpc("reassign_document_category", {
			p_from_id: defaultRow!.id,
			p_to_id: target.id,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/default categories cannot be deleted/i);
	});

	it("reassign_document_category: rejects self-reference", async () => {
		const cat = await seedCategory("phase66_self_ref", "Self Ref");
		const { error } = await clientA.rpc("reassign_document_category", {
			p_from_id: cat.id,
			p_to_id: cat.id,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/itself/i);
	});

	it("reassign_document_category: rejects cross-owner source/target", async () => {
		// ownerB calling with ownerA's category ids should fail.
		const target = await seedCategory(
			"phase66_cross_owner_target",
			"Cross Owner Target",
		);
		const source = await seedCategory(
			"phase66_cross_owner_source",
			"Cross Owner Source",
		);
		const { error } = await clientB.rpc("reassign_document_category", {
			p_from_id: source.id,
			p_to_id: target.id,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/not found or not owned by caller/i);
	});

	it("reorder_document_categories: persists sort_order for every row in the input", async () => {
		const a = await seedCategory("phase66_reorder_a", "Reorder A");
		const b = await seedCategory("phase66_reorder_b", "Reorder B");

		const { error } = await clientA.rpc("reorder_document_categories", {
			p_orders: [
				{ id: a.id, sort_order: 1234 },
				{ id: b.id, sort_order: 5678 },
			],
		});
		expect(error).toBeNull();

		const { data } = await clientA
			.from("document_categories")
			.select("id, sort_order")
			.in("id", [a.id, b.id]);
		const byId = new Map(
			((data ?? []) as Array<{ id: string; sort_order: number }>).map((r) => [
				r.id,
				r.sort_order,
			]),
		);
		expect(byId.get(a.id)).toBe(1234);
		expect(byId.get(b.id)).toBe(5678);
	});

	it("reorder_document_categories: fail-closed when any referenced row is foreign", async () => {
		const own = await seedCategory("phase66_reorder_own", "Own");
		// Insert a row under ownerB so we have a real foreign id.
		const {
			data: { user: uB },
		} = await clientB.auth.getUser();
		const { data: foreign } = await clientB
			.from("document_categories")
			.insert({
				owner_user_id: uB!.id,
				slug: `phase66_reorder_foreign${SLUG_SUFFIX}`.slice(0, 50),
				label: "Foreign",
				sort_order: 999,
				is_default: false,
			})
			.select("id")
			.single();
		expect(foreign?.id).toBeDefined();

		const { error } = await clientA.rpc("reorder_document_categories", {
			p_orders: [
				{ id: own.id, sort_order: 100 },
				{ id: foreign!.id, sort_order: 200 },
			],
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/not found or not owned by caller/i);

		// Cleanup the foreign row under ownerB.
		await clientB.from("document_categories").delete().eq("id", foreign!.id);
	});

	it("reorder_document_categories: rejects non-array p_orders", async () => {
		// Intentionally invalid input to verify runtime rejection — the
		// RPC param is typed as `Json` so a plain object satisfies the
		// type system, but the function checks `jsonb_typeof <> 'array'`.
		const { error } = await clientA.rpc("reorder_document_categories", {
			p_orders: { not: "an array" },
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/must be a json array/i);
	});

	// Cycle-5 M-3: pin the null-param branches that the cycle-3 review
	// flagged as missing coverage. These branches raise 22023 with a
	// specific message. The RPC params are typed `string`/`Json`, so
	// passing `null` is intentionally invalid at the type level and
	// suppressed via @ts-expect-error rather than the Zero-Tolerance-
	// banned `as unknown as` double-cast.
	it("reassign_document_category: rejects null p_from_id", async () => {
		const { error } = await clientA.rpc("reassign_document_category", {
			// @ts-expect-error — intentionally null to exercise the runtime guard
			p_from_id: null,
			p_to_id: "00000000-0000-0000-0000-000000000001",
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/p_from_id and p_to_id are required/i);
	});

	it("reassign_document_category: rejects null p_to_id", async () => {
		const { error } = await clientA.rpc("reassign_document_category", {
			p_from_id: "00000000-0000-0000-0000-000000000001",
			// @ts-expect-error — intentionally null to exercise the runtime guard
			p_to_id: null,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/p_from_id and p_to_id are required/i);
	});

	it("reorder_document_categories: rejects null p_orders", async () => {
		const { error } = await clientA.rpc("reorder_document_categories", {
			// @ts-expect-error — intentionally null to exercise the runtime guard
			p_orders: null,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/must be a json array/i);
	});

	// Phase 66 cycle-1 I-4: per-element shape validation. The RPC raises
	// a clear 22023 instead of letting cast/null violations leak through
	// as generic 500s.
	it("reorder_document_categories: rejects entries missing sort_order", async () => {
		const cat = await seedCategory("phase66_shape_probe", "Shape Probe");
		const { error } = await clientA.rpc("reorder_document_categories", {
			p_orders: [{ id: cat.id }],
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(
			/each entry must have id .* and sort_order/i,
		);
	});

	it("reorder_document_categories: rejects entries with non-numeric sort_order", async () => {
		const cat = await seedCategory("phase66_shape_string", "Shape String");
		const { error } = await clientA.rpc("reorder_document_categories", {
			p_orders: [{ id: cat.id, sort_order: "not_a_number" }],
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(
			/each entry must have id .* and sort_order/i,
		);
	});
});
