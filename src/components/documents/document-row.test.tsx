/**
 * DocumentRow preview footer: a row given `lockedNote` and no `onDelete` shows
 * the note in place of Remove, below the title; `onDelete` takes precedence.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DocumentRow as DocumentRowData } from "#hooks/api/query-keys/document-keys";
import { DocumentRow } from "./document-row";
import { SIGNED_LEASE_LOCKED_NOTE } from "./documents-section-helpers";

const SIGNED_LEASE: DocumentRowData = {
	id: "doc-1",
	entity_type: "lease",
	entity_id: "lease-1",
	document_type: "lease",
	mime_type: "application/pdf",
	file_path: "lease/lease-1/signed-lease.pdf",
	storage_url: "lease/lease-1/signed-lease.pdf",
	file_size: 1024,
	title: "Signed lease: Maple Apartments, 4B (Jane Doe)",
	tags: null,
	description: null,
	owner_user_id: "owner-1",
	created_at: "2026-11-14T00:00:00Z",
	signed_url: "https://storage.example/signed/lease.pdf",
};

function renderOpen(extra: {
	onDelete?: (doc: DocumentRowData) => void;
	lockedNote?: string;
}) {
	render(
		<ul>
			<DocumentRow
				doc={SIGNED_LEASE}
				isOpen
				onOpenChange={() => undefined}
				{...extra}
			/>
		</ul>,
	);
}

describe("DocumentRow preview footer", () => {
	it("shows the locked note, on its own line, and no Remove button", () => {
		renderOpen({ lockedNote: SIGNED_LEASE_LOCKED_NOTE });

		const note = screen.getByText(SIGNED_LEASE_LOCKED_NOTE);
		expect(note).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /remove/i }),
		).not.toBeInTheDocument();
		// Not squeezed into the flex row that holds the title.
		const titleInFooter = screen
			.getAllByText(SIGNED_LEASE.title ?? "")
			.find((el) => el.closest(".p-2") === note.parentElement);
		expect(titleInFooter).toBeDefined();
		expect(titleInFooter?.parentElement).not.toBe(note.parentElement);
	});

	it("shows Remove and no note when onDelete is given", () => {
		renderOpen({ onDelete: vi.fn(), lockedNote: SIGNED_LEASE_LOCKED_NOTE });

		expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
		expect(
			screen.queryByText(SIGNED_LEASE_LOCKED_NOTE),
		).not.toBeInTheDocument();
	});

	it("shows neither on a read-only row", () => {
		renderOpen({});

		expect(
			screen.queryByRole("button", { name: /remove/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(SIGNED_LEASE_LOCKED_NOTE),
		).not.toBeInTheDocument();
	});
});
