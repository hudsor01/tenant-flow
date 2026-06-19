/**
 * SignLeaseForm Component Tests
 * Public tenant-facing electronic signing form.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { SignLeaseForm } from "../sign-lease-form";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
vi.stubGlobal("open", vi.fn());
if (!URL.createObjectURL) {
	URL.createObjectURL = vi.fn(() => "blob:mock");
	URL.revokeObjectURL = vi.fn();
}

/** Find the fetch call whose body has the given action. */
function fetchBodyFor(action: string): Record<string, unknown> | undefined {
	for (const call of fetchMock.mock.calls) {
		const body = JSON.parse((call?.[1] as { body: string }).body);
		if (body.action === action) return body;
	}
	return undefined;
}

/** Read the lease (required before consent is enabled). */
async function viewLease() {
	fireEvent.click(screen.getByTestId("view-lease-button"));
	await waitFor(() =>
		expect(screen.getByTestId("sign-consent-checkbox")).toBeEnabled(),
	);
}

describe("SignLeaseForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, both_signed: false }),
			blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
		});
	});

	it("prefills the tenant name and keeps the button disabled until viewed + consent", () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		expect(screen.getByTestId("signer-name-input")).toHaveValue("Jane Doe");
		expect(screen.getByTestId("sign-consent-checkbox")).toBeDisabled();
		expect(screen.getByTestId("sign-lease-submit")).toBeDisabled();
	});

	it("requires reading the lease before consent can be given", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		expect(screen.getByTestId("sign-consent-checkbox")).toBeDisabled();
		await viewLease();
		expect(fetchBodyFor("document")).toMatchObject({
			action: "document",
			token: "tok-1",
		});
		expect(screen.getByTestId("sign-consent-checkbox")).toBeEnabled();
	});

	it("enables and submits once viewed + name + consent are provided", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		const submit = screen.getByTestId("sign-lease-submit");
		expect(submit).toBeEnabled();

		fireEvent.click(submit);

		await waitFor(() => {
			expect(screen.getByTestId("sign-lease-success")).toBeInTheDocument();
		});
		expect(fetchBodyFor("sign")).toMatchObject({
			action: "sign",
			token: "tok-1",
			signerName: "Jane Doe",
			consent: true,
		});
	});

	it("announces full activation when both parties have signed", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, both_signed: true }),
			blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
		});
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByText(/now active/i)).toBeInTheDocument();
		});
	});

	it("surfaces a friendly message when the token is rejected", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: false, reason: "expired_token" }),
			blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
		});
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/expired/i);
		});
		expect(screen.queryByTestId("sign-lease-success")).not.toBeInTheDocument();
	});

	it("re-locks consent and shows an error when the lease document fails to load", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			json: async () => ({}),
			blob: async () => new Blob(),
		});
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		fireEvent.click(screen.getByTestId("view-lease-button"));
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/couldn't open the lease/i,
			);
		});
		expect(screen.getByTestId("sign-consent-checkbox")).toBeDisabled();
	});

	it("shows a fallback link when the document popup is blocked", async () => {
		// window.open is a vi.fn() (returns undefined) => the blocked branch runs.
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		fireEvent.click(screen.getByTestId("view-lease-button"));
		await waitFor(() => {
			expect(
				screen.getByTestId("view-lease-fallback-link"),
			).toBeInTheDocument();
		});
	});

	it("shows generic retry copy (not invalid/expired) on a no-reason server error", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		// success:false with NO reason — a transient server fault, not a bad link.
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: false }),
		});
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/couldn't record your signature/i,
			);
		});
		const alertText = screen.getByRole("alert").textContent ?? "";
		expect(alertText).not.toMatch(/invalid|expired/i);
		expect(screen.queryByTestId("sign-lease-success")).not.toBeInTheDocument();
	});

	it("shows a generic error when the sign request throws", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		fetchMock.mockRejectedValueOnce(new Error("network"));
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				/something went wrong/i,
			);
		});
		expect(screen.queryByTestId("sign-lease-success")).not.toBeInTheDocument();
	});

	it("submits the edited, trimmed signer name", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		fireEvent.change(screen.getByTestId("signer-name-input"), {
			target: { value: "  John Q Renter  " },
		});
		await viewLease();
		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByTestId("sign-lease-success")).toBeInTheDocument();
		});
		expect(fetchBodyFor("sign")?.signerName).toBe("John Q Renter");
	});
});
