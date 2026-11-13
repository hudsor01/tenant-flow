/**
 * The printed work order names the request's vendor and how to reach them.
 * It printed `assigned_to`, a user id nothing writes, under "Assigned to".
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";
import { buildWorkOrderHtml } from "../work-order-template";

const ASSIGNED_TO = "9d9d9d9d-0000-4000-8000-00000000dead";

function workOrder(
	vendor: { name: string; phone: string | null; email: string | null } | null,
) {
	return buildWorkOrderHtml({
		request: { ...DEFAULT_MAINTENANCE_REQUEST, assigned_to: ASSIGNED_TO },
		propertyName: "Maple Court",
		unitNumber: "4B",
		vendor,
		expenses: [],
		totalExpenses: "$0.00",
	});
}

describe("the work order's vendor", () => {
	it("names the vendor and how to reach them", () => {
		const html = workOrder({
			name: "Ace Plumbing",
			phone: "(555) 010-2000",
			email: "jobs@aceplumbing.example",
		});
		expect(html).toContain(">Vendor<");
		expect(html).toContain("Ace Plumbing");
		expect(html).toContain("(555) 010-2000 · jobs@aceplumbing.example");
		expect(html).not.toContain(ASSIGNED_TO);
		expect(html).not.toContain("Assigned to");
	});

	it("prints a dash for a missing vendor or contact", () => {
		const none = workOrder(null);
		expect(none).toMatch(/>Vendor<\/div>\s*<div class="field-value">—</);
		expect(none).toMatch(
			/>Vendor contact<\/div>\s*<div class="field-value">—</,
		);
		const noEmail = workOrder({
			name: "Ace Plumbing",
			phone: "(555) 010-2000",
			email: null,
		});
		expect(noEmail).toContain(">(555) 010-2000<");
	});

	it("escapes the vendor's name", () => {
		const html = workOrder({
			name: "<b>Ace</b> & Sons",
			phone: null,
			email: null,
		});
		expect(html).toContain("&lt;b&gt;Ace&lt;/b&gt; &amp; Sons");
		expect(html).not.toContain("<b>Ace</b>");
	});
});
