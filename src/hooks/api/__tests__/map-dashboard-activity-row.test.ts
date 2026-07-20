import { describe, expect, it } from "vitest";

import { mapDashboardActivityRow } from "../use-owner-dashboard";

// Direct coverage for the get_dashboard_data_v2 activity boundary mapper (C9):
// snake_case RPC row -> camelCase ActivityItem, with NOT NULL fields throwing.
describe("mapDashboardActivityRow (C9)", () => {
	it("maps a snake_case RPC row to a camelCase ActivityItem", () => {
		const result = mapDashboardActivityRow({
			id: "act-1",
			user_id: "owner-1",
			title: "Lease signed",
			description: "123 Main St, Unit 4",
			activity_type: "leases",
			entity_type: "lease",
			entity_id: "lease-1",
			created_at: "2026-07-19T12:00:00.000Z",
		});

		expect(result).toEqual({
			id: "act-1",
			user_id: "owner-1",
			action: "Lease signed",
			entityType: "lease",
			entityId: "lease-1",
			entityName: "123 Main St, Unit 4",
			created_at: "2026-07-19T12:00:00.000Z",
			description: "123 Main St, Unit 4",
		});
	});

	it("falls back to empty strings for null columns and omits description", () => {
		const result = mapDashboardActivityRow({
			id: "act-2",
			user_id: "owner-1",
			title: "Payment recorded",
			description: null,
			activity_type: "payment",
			entity_type: null,
			entity_id: null,
			created_at: null,
		});

		expect(result).toEqual({
			id: "act-2",
			user_id: "owner-1",
			action: "Payment recorded",
			entityType: "",
			entityId: "",
			entityName: "",
			created_at: "",
		});
		expect(result).not.toHaveProperty("description");
	});

	it("throws when a NOT NULL field is missing (id)", () => {
		expect(() =>
			mapDashboardActivityRow({
				user_id: "owner-1",
				title: "Orphan",
				activity_type: "leases",
			}),
		).toThrow(/NOT NULL field 'id'/);
	});

	it("throws when a NOT NULL field is the wrong type (title)", () => {
		expect(() =>
			mapDashboardActivityRow({
				id: "act-3",
				user_id: "owner-1",
				title: 42,
				activity_type: "leases",
			}),
		).toThrow(/NOT NULL field 'title'/);
	});
});
