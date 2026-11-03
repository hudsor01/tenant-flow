/**
 * The lease page's heading names the lease by its property and unit, as the
 * leases table does (66.2-39 fix round 1, part P). It printed the first eight
 * characters of the lease's id after "Lease #".
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeaseHeader } from "#components/leases/detail/lease-header";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

vi.mock("#components/leases/download-signed-lease-button", () => ({
	DownloadSignedLeaseButton: () => null,
}));
vi.mock("#components/leases/rent-increase-notice-dialog", () => ({
	RentIncreaseNoticeDialog: () => null,
}));
vi.mock("#components/leases/send-for-signature-button", () => ({
	SendForSignatureButton: () => null,
}));
vi.mock("#components/leases/sign-lease-button", () => ({
	SignLeaseButton: () => null,
}));

const LEASE = { ...DEFAULT_LEASE, id: "3f2a9c1e-0000-4000-8000-000000000001" };

describe("the lease page's heading", () => {
	it.each([
		["Maple Court", "4B", "Maple Court · Unit 4B"],
		["Maple Court", null, "Maple Court"],
		[null, "4B", "Unit 4B"],
		["  ", null, "Lease"],
	])(
		"for property %s, unit %s, reads %s",
		(propertyName, unitName, heading) => {
			render(
				<LeaseHeader
					lease={LEASE}
					tenant={null}
					propertyName={propertyName}
					unitName={unitName}
					onCancelSignature={async () => undefined}
					isCancelling={false}
				/>,
			);
			const h2 = screen.getByRole("heading", { level: 2 });
			expect(h2).toHaveTextContent(heading);
			expect(h2.textContent).not.toMatch(/3f2a9c1e|#/);
		},
	);
});
