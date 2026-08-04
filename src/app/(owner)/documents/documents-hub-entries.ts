/**
 * The `/documents` hub directory — 6 entries in 3 bands (D-01, D-07).
 *
 * Route-colocated typed data module, mirroring the shape of
 * `../reports/reports-hub-entries.ts`. This is NOT a barrel file (CLAUDE.md
 * ZT-2): it declares its own data and re-exports nothing.
 *
 * The entry order and the band order are pinned by
 * `__tests__/documents-hub.test.ts`. `page.tsx` is pure composition over these
 * two arrays, so pinning the data pins the rendered structure — and filtering
 * by band rather than hand-listing tiles is what removes the drift surface this
 * module exists to remove.
 *
 * Descending weight is the whole composition (65-UI-SPEC §I-1): the vault band
 * is full width with a `size-12` accent medallion, Band 2 steps down to
 * `size-10`, Band 3 to `size-8`. Nothing here carries a `gatedReportType` or
 * badge analogue — there is no tier gate on this surface, and badging an
 * ungated destination would be a false claim about what a paid plan buys.
 */

import type { LucideIcon } from "lucide-react";
import {
	ClipboardCheck,
	ClipboardList,
	FileCheck,
	FileWarning,
	FolderArchive,
	Wrench,
} from "lucide-react";

export type DocumentsHubBandId = "vault" | "build" | "printables";

export interface DocumentsHubEntry {
	id: string;
	band: DocumentsHubBandId;
	title: string;
	href: string;
	icon: LucideIcon;
	description: string;
}

export interface DocumentsHubBand {
	id: DocumentsHubBandId;
	/** The id the band's <section aria-labelledby> points at. */
	headingId: string;
	/** null on the vault band: its <h2> IS the vault entry's title (I-4). */
	title: string | null;
	/** null where the band carries no one-liner. */
	description: string | null;
}

/** The vault, then what you build, then what you print. */
export const DOCUMENTS_HUB_BANDS: readonly DocumentsHubBand[] = [
	{
		id: "vault",
		headingId: "documents-vault",
		title: null,
		description: null,
	},
	{
		id: "build",
		headingId: "documents-build",
		title: "Build a document",
		description: null,
	},
	{
		id: "printables",
		headingId: "documents-printables",
		title: "Printable forms",
		description: "Fill in and download a ready-to-print PDF.",
	},
];

/**
 * Exported separately so `page.tsx` gets the Band 1 entry without a `.find()`
 * that would be `| undefined` under `noUncheckedIndexedAccess`. It is also a
 * member of `DOCUMENTS_HUB_ENTRIES` BY REFERENCE — the test pins that identity,
 * because a structural clone would render the vault twice.
 */
export const DOCUMENTS_VAULT_ENTRY: DocumentsHubEntry = {
	id: "vault",
	band: "vault",
	title: "Document Vault",
	href: "/documents/vault",
	icon: FolderArchive,
	description:
		"Search, filter, and bulk-download every document attached to your properties, leases, tenants, and maintenance requests.",
};

/**
 * Six entries, in render order. Every icon is distinct on purpose (§I-5): all
 * four template pages ship `FileText` today, and reusing one glyph across two
 * tiles is the regression this order-and-icon set is pinned against.
 */
export const DOCUMENTS_HUB_ENTRIES: readonly DocumentsHubEntry[] = [
	DOCUMENTS_VAULT_ENTRY,
	{
		id: "lease-template",
		band: "build",
		title: "Lease Template Builder",
		href: "/documents/lease-template",
		icon: FileCheck,
		description:
			"Draft a lease from your own clauses, branding, and custom fields, then send it for signature.",
	},
	{
		id: "rental-application",
		band: "printables",
		title: "Rental Application",
		href: "/documents/templates/rental-application",
		icon: ClipboardList,
		description:
			"Collect applicant details and background-check authorization.",
	},
	{
		id: "property-inspection",
		band: "printables",
		title: "Property Inspection",
		href: "/documents/templates/property-inspection",
		icon: ClipboardCheck,
		description:
			"Record move-in and move-out condition with checklists and photos.",
	},
	{
		id: "maintenance-request",
		band: "printables",
		title: "Maintenance Request",
		href: "/documents/templates/maintenance-request",
		icon: Wrench,
		description: "Issue a work order for a vendor or tenant.",
	},
	{
		id: "tenant-notice",
		band: "printables",
		title: "Tenant Notice",
		href: "/documents/templates/tenant-notice",
		icon: FileWarning,
		description: "Late rent, lease violation, and move-out notices.",
	},
];
