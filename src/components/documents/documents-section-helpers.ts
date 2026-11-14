/**
 * Pure helpers extracted from `documents-section.tsx` to keep the
 * component under the 300-line cap. No React, no hooks — only the
 * file-validation rules, the upload-result toast formatter, and the
 * signed-lease check that decides whether a row offers Remove.
 */

import { toast } from "sonner";
import type { DocumentRow as DocumentRowData } from "#hooks/api/query-keys/document-keys";

/** Shown in the signed lease's preview in place of the Remove button. */
export const SIGNED_LEASE_LOCKED_NOTE =
	"E-signed copy, filed automatically. It stays with this lease and can't be removed.";

/**
 * True for the executed PDF of an e-signed lease, which the
 * `trg_file_signed_lease_in_vault` trigger files in the vault at
 * `lease/<lease id>/signed-lease.pdf`. That row shares its storage object
 * with `leases.signed_document_path`, and `protect_signed_lease_document`
 * rejects deleting it, so the section offers no Remove action for it.
 */
export function isSignedLeaseDocument(
	doc: Pick<DocumentRowData, "entity_type" | "entity_id" | "file_path">,
): boolean {
	return (
		doc.entity_type === "lease" &&
		doc.file_path === `lease/${doc.entity_id}/signed-lease.pdf`
	);
}

// `image/jpg` is a quirk some Safari iOS versions report for Photos exports.
// The bucket allowlist accepts it; the frontend accept list must match so
// iPhone uploads aren't rejected before hitting storage.
export const ACCEPTED_MIME_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — matches bucket limit
const MAX_FAILURES_IN_TOAST = 5;

export interface UploadSummary {
	uploaded: number;
	failures: string[];
	rejected: string[];
}

export function validateFiles(files: File[]): {
	valid: File[];
	rejected: string[];
} {
	const valid: File[] = [];
	const rejected: string[] = [];
	for (const file of files) {
		if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
			rejected.push(
				`${file.name} — unsupported type (PDF, JPG, PNG, WebP only)`,
			);
		} else if (file.size > MAX_FILE_SIZE_BYTES) {
			rejected.push(`${file.name} — exceeds 10 MB`);
		} else if (file.size === 0) {
			rejected.push(`${file.name} — empty file`);
		} else {
			valid.push(file);
		}
	}
	return { valid, rejected };
}

// Cap the toast description so a 50-file batch failure isn't an unreadable
// wall of text. Full list stays in console for diagnosis.
function truncateForToast(errors: string[]): string {
	if (errors.length <= MAX_FAILURES_IN_TOAST) return errors.join("\n");
	const head = errors.slice(0, MAX_FAILURES_IN_TOAST).join("\n");
	return `${head}\n…and ${errors.length - MAX_FAILURES_IN_TOAST} more (see console)`;
}

export function reportUploadSummary(summary: UploadSummary) {
	const { uploaded, failures, rejected } = summary;
	const errors = [...rejected, ...failures];
	if (errors.length > MAX_FAILURES_IN_TOAST) {
		console.warn("Document upload errors (full list):", errors);
	}
	if (uploaded > 0 && errors.length === 0) {
		toast.success(`Uploaded ${uploaded} file${uploaded === 1 ? "" : "s"}`);
		return;
	}
	if (uploaded > 0 && errors.length > 0) {
		toast.warning(`Uploaded ${uploaded} · skipped ${errors.length}`, {
			description: truncateForToast(errors),
			duration: 10000,
		});
		return;
	}
	if (uploaded === 0 && errors.length > 0) {
		toast.error(
			`Skipped ${errors.length} file${errors.length === 1 ? "" : "s"}`,
			{
				description: truncateForToast(errors),
				duration: 10000,
			},
		);
	}
}
