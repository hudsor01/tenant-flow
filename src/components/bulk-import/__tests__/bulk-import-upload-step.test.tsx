/**
 * @vitest-environment jsdom
 * BulkImportUploadStep drag-state styling (66.2-39 F9).
 *
 * The FileUploadDropzone primitive marks a drag with `data-dragging` (and a
 * rejected file with `data-invalid`, a disabled upload with `data-disabled`).
 * The step's drag classes were written against `data-drag-over`, which nothing
 * sets, so all nine never applied. Every data-attribute variant on the
 * dropzone and inside it must name an attribute the primitive renders, and a
 * drag must set the one the drag classes target.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tenantBulkImportConfig } from "#components/tenants/bulk-import-config";
import { BulkImportUploadStep } from "../bulk-import-upload-step";
import { CSV_MAX_FILE_SIZE_BYTES } from "../parse-csv-with-schema";

const PRIMITIVE_ATTRIBUTES = new Set([
	"data-dragging",
	"data-invalid",
	"data-disabled",
]);

function dataVariantAttributes(root: Element): string[] {
	const names = new Set<string>();
	for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
		for (const cls of (el.getAttribute("class") ?? "").split(/\s+/)) {
			for (const match of cls.matchAll(/(?:^|:|-)data-([a-z][a-z-]*):/g)) {
				names.add(`data-${match[1]}`);
			}
		}
	}
	return [...names].sort();
}

function renderDropzone(): HTMLElement {
	const { container } = render(
		<BulkImportUploadStep
			config={tenantBulkImportConfig()}
			onFileSelect={() => undefined}
		/>,
	);
	const dropzone = container.querySelector<HTMLElement>(
		'[data-slot="file-upload-dropzone"]',
	);
	if (!dropzone) throw new Error("no file-upload-dropzone rendered");
	return dropzone;
}

describe("BulkImportUploadStep drag state", () => {
	it("targets only data attributes the dropzone primitive sets", () => {
		const dropzone = renderDropzone();
		const attributes = dataVariantAttributes(dropzone);
		expect(attributes).toContain("data-dragging");
		expect(attributes.filter((a) => !PRIMITIVE_ATTRIBUTES.has(a))).toEqual([]);
	});

	it("sets data-dragging during a drag, which the drag classes key on", () => {
		const dropzone = renderDropzone();
		expect(dropzone).not.toHaveAttribute("data-dragging");
		fireEvent.dragEnter(dropzone, { dataTransfer: { types: ["Files"] } });
		expect(dropzone).toHaveAttribute("data-dragging");
		expect(dropzone.classList).toContain("data-dragging:border-primary");
		expect(dropzone.classList).toContain("data-dragging:bg-primary/10");
		const icon = dropzone.querySelector(".icon-container-lg");
		expect(icon?.classList).toContain("group-data-dragging:scale-110");
	});
});

describe("BulkImportUploadStep — a refused file", () => {
	function chooseFile(file: File) {
		const input =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		if (!input) throw new Error("no file input rendered");
		fireEvent.change(input, { target: { files: [file] } });
	}

	it("says why it refused the file, and clears that once a CSV is accepted", () => {
		const accepted: File[] = [];
		render(
			<BulkImportUploadStep
				config={tenantBulkImportConfig()}
				onFileSelect={(file) => accepted.push(file)}
			/>,
		);
		expect(screen.queryByRole("alert")).toBeNull();

		chooseFile(
			new File(["a,b"], "tenants.xlsx", { type: "application/vnd.ms-excel" }),
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Please select a CSV file (.csv)",
		);

		chooseFile(
			new File([new Uint8Array(CSV_MAX_FILE_SIZE_BYTES + 1)], "tenants.csv", {
				type: "text/csv",
			}),
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"File size must be less than 5MB",
		);
		expect(accepted).toEqual([]);

		const good = new File(["first_name,last_name,email"], "tenants.csv", {
			type: "text/csv",
		});
		chooseFile(good);
		expect(accepted).toEqual([good]);
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
