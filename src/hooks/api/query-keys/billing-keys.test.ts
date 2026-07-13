import { describe, expect, it } from "vitest";
import { mapInvoiceStatus } from "./billing-keys";

describe("mapInvoiceStatus", () => {
	it("maps paid → succeeded", () => {
		expect(mapInvoiceStatus("paid")).toBe("succeeded");
	});

	it("maps open → pending", () => {
		expect(mapInvoiceStatus("open")).toBe("pending");
	});

	it("maps draft → pending", () => {
		expect(mapInvoiceStatus("draft")).toBe("pending");
	});

	it("maps void → cancelled", () => {
		expect(mapInvoiceStatus("void")).toBe("cancelled");
	});

	it("maps uncollectible → failed", () => {
		expect(mapInvoiceStatus("uncollectible")).toBe("failed");
	});

	it("maps an unknown status → pending (fail-soft, does not throw)", () => {
		expect(mapInvoiceStatus("some_future_status")).toBe("pending");
		expect(mapInvoiceStatus("")).toBe("pending");
	});
});
