/**
 * SendForSignatureButton — preview-abort race coverage (issue #853).
 *
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { SendForSignatureButton } from "../send-for-signature-button";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSendForSignature = { mutateAsync: vi.fn(), isPending: false };
const mockResendSignature = { mutateAsync: vi.fn(), isPending: false };
vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useSendLeaseForSignatureMutation: () => mockSendForSignature,
	useResendSignatureRequestMutation: () => mockResendSignature,
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: {
			getSession: async () => ({
				data: { session: { access_token: "token" } },
			}),
		},
	}),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
const openSpy = vi.fn();
vi.stubGlobal("open", openSpy);
URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

/** A promise plus its resolver, so the test controls when the fetch settles. */
function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

const pdfResponse = {
	ok: true,
	blob: async () => new Blob(["%PDF"], { type: "application/pdf" }),
};

describe("SendForSignatureButton preview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function openDialogAndPreview() {
		render(<SendForSignatureButton leaseId="lease-1" />);
		fireEvent.click(screen.getByTestId("send-for-signature-button"));
		const previewBtn = await screen.findByRole("button", {
			name: /preview pdf/i,
		});
		fireEvent.click(previewBtn);
	}

	it("opens the preview tab when the dialog stays open", async () => {
		fetchMock.mockResolvedValue(pdfResponse);
		await openDialogAndPreview();

		await waitFor(() => expect(openSpy).toHaveBeenCalled());
		expect(openSpy).toHaveBeenCalledWith(
			"blob:mock",
			"_blank",
			"noopener,noreferrer",
		);
	});

	it("does NOT open a tab when the dialog is closed before the preview resolves", async () => {
		const d = deferred<typeof pdfResponse>();
		fetchMock.mockReturnValue(d.promise);
		await openDialogAndPreview();

		// Close the dialog mid-fetch (Cancel), then let the fetch resolve.
		fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
		d.resolve(pdfResponse);

		// Give the resolved chain a tick; window.open must stay un-called.
		await new Promise((r) => setTimeout(r, 0));
		expect(openSpy).not.toHaveBeenCalled();
	});
});
