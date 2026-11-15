import { describe, expect, it } from "vitest";
import { isSignedLeaseDocument } from "./documents-section-helpers";

const LEASE_ID = "7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b";

describe("isSignedLeaseDocument", () => {
	it("matches the signed PDF filed under its own lease", () => {
		expect(
			isSignedLeaseDocument({
				entity_type: "lease",
				entity_id: LEASE_ID,
				file_path: `lease/${LEASE_ID}/signed-lease.pdf`,
			}),
		).toBe(true);
	});

	it("does not match another file uploaded to the lease", () => {
		expect(
			isSignedLeaseDocument({
				entity_type: "lease",
				entity_id: LEASE_ID,
				file_path: `lease/${LEASE_ID}/1731571200000-signed-lease.pdf`,
			}),
		).toBe(false);
	});

	it("does not match a signed-lease path that belongs to a different lease", () => {
		expect(
			isSignedLeaseDocument({
				entity_type: "lease",
				entity_id: LEASE_ID,
				file_path:
					"lease/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d/signed-lease.pdf",
			}),
		).toBe(false);
	});

	it("does not match a document attached to another entity type", () => {
		expect(
			isSignedLeaseDocument({
				entity_type: "property",
				entity_id: LEASE_ID,
				file_path: `lease/${LEASE_ID}/signed-lease.pdf`,
			}),
		).toBe(false);
	});
});
