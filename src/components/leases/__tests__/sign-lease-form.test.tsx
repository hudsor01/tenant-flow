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

function lastFetchBody(): Record<string, unknown> {
	const call = fetchMock.mock.calls.at(-1);
	return JSON.parse((call?.[1] as { body: string }).body);
}

describe("SignLeaseForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, both_signed: false }),
		});
	});

	it("prefills the tenant name and keeps the button disabled until consent", () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		expect(screen.getByTestId("signer-name-input")).toHaveValue("Jane Doe");
		expect(screen.getByTestId("sign-lease-submit")).toBeDisabled();
	});

	it("enables and submits once name + consent are provided", async () => {
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		const submit = screen.getByTestId("sign-lease-submit");
		expect(submit).toBeEnabled();

		fireEvent.click(submit);

		await waitFor(() => {
			expect(screen.getByTestId("sign-lease-success")).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/functions/v1/sign-lease-token"),
			expect.objectContaining({ method: "POST" }),
		);
		const body = lastFetchBody();
		expect(body).toMatchObject({
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
		});
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

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
		});
		render(<SignLeaseForm token="tok-1" tenantName="Jane Doe" />);

		fireEvent.click(screen.getByTestId("sign-consent-checkbox"));
		fireEvent.click(screen.getByTestId("sign-lease-submit"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/expired/i);
		});
		expect(screen.queryByTestId("sign-lease-success")).not.toBeInTheDocument();
	});
});
