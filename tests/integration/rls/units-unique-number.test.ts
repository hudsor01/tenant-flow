/**
 * A property can't hold two units with the same number
 * (`units_property_unit_number_key`, migration
 * `20261128172746_units_unique_number_per_property`).
 *
 * The index is on `(property_id, lower(btrim(unit_number)))` for units that
 * are not deleted (`status <> 'inactive'`). This pins, against the live
 * database, each part of that key: the same number on the same property is
 * refused, also with other casing and surrounding spaces; another property
 * may use it; and a deleted unit's number can be used again.
 *
 * Fixtures: two properties owned by owner A, created here and hard-deleted
 * in afterAll (units cascade with their property).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestClient, getTestCredentials } from "../setup/supabase-client";

const NUMBER = "UQ-101";

describe("units_property_unit_number_key", () => {
	let client: SupabaseClient;
	let ownerId: string;
	const propertyIds: string[] = [];

	async function createProperty(label: string): Promise<string> {
		const { data, error } = await client
			.from("properties")
			.insert({
				name: `Unit Number Test ${label}`,
				address_line1: "12 Unique St",
				city: "Testville",
				state: "TX",
				postal_code: "78701",
				country: "US",
				property_type: "APARTMENT",
				owner_user_id: ownerId,
			})
			.select("id")
			.single();
		expect(error).toBeNull();
		propertyIds.push(data!.id);
		return data!.id;
	}

	function insertUnit(propertyId: string, unitNumber: string) {
		return client
			.from("units")
			.insert({
				property_id: propertyId,
				unit_number: unitNumber,
				bedrooms: 1,
				bathrooms: 1,
				rent_amount: 1200,
				owner_user_id: ownerId,
			})
			.select("id")
			.single();
	}

	let propertyA: string;
	let propertyB: string;

	beforeAll(async () => {
		const { ownerA } = getTestCredentials();
		client = await createTestClient(ownerA.email, ownerA.password);
		const {
			data: { user },
		} = await client.auth.getUser();
		ownerId = user!.id;
		propertyA = await createProperty("A");
		propertyB = await createProperty("B");
	});

	afterAll(async () => {
		for (const id of propertyIds) {
			await client.from("properties").delete().eq("id", id);
		}
	});

	it("refuses a second unit with the same number on one property", async () => {
		const first = await insertUnit(propertyA, NUMBER);
		expect(first.error).toBeNull();

		const second = await insertUnit(propertyA, NUMBER);
		expect(second.data).toBeNull();
		expect(second.error).toMatchObject({
			code: "23505",
			message: expect.stringContaining("units_property_unit_number_key"),
		});
	});

	it("treats other casing and surrounding spaces as the same number", async () => {
		const variant = await insertUnit(propertyA, `  ${NUMBER.toLowerCase()} `);
		expect(variant.data).toBeNull();
		expect(variant.error).toMatchObject({ code: "23505" });
	});

	it("lets another property use the same number", async () => {
		const other = await insertUnit(propertyB, NUMBER);
		expect(other.error).toBeNull();
	});

	it("frees a deleted unit's number for a new unit", async () => {
		const { data: existing, error: readError } = await client
			.from("units")
			.select("id")
			.eq("property_id", propertyA)
			.eq("unit_number", NUMBER)
			.neq("status", "inactive")
			.single();
		expect(readError).toBeNull();

		const { error: deleteError } = await client
			.from("units")
			.update({ status: "inactive" })
			.eq("id", existing!.id);
		expect(deleteError).toBeNull();

		const replacement = await insertUnit(propertyA, NUMBER);
		expect(replacement.error).toBeNull();
	});
});
