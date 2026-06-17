// Pure-JS lease PDF renderer (pdf-lib). Renders the residential lease summary,
// the owner + tenant signature blocks, and -- once both parties have signed --
// an electronic-signature audit certificate. Used for BOTH the pre-send preview
// (unsigned) and the finalized signed document.
//
// This deliberately does NOT call StirlingPDF (or any external renderer): the
// signing critical path must have zero self-hosted/homelab dependency. pdf-lib
// is pure JavaScript and runs in the Deno Edge runtime.

import {
	PDFDocument,
	type PDFFont,
	type PDFPage,
	StandardFonts,
	rgb,
} from "pdf-lib";

export interface LeasePdfParty {
	label: string;
	name: string;
	email: string;
	/** ISO timestamp the party signed, or null if not yet signed. */
	signedAt: string | null;
	ip: string | null;
	userAgent: string | null;
	/** Signature method, e.g. 'in_app'. */
	method: string | null;
}

export interface LeasePdfData {
	leaseId: string;
	propertyLabel: string;
	unitNumber: string;
	startDate: string;
	endDate: string;
	rent: string;
	securityDeposit: string;
	governingState: string | null;
	landlordNoticeAddress: string | null;
	immediateFamilyMembers: string | null;
	owner: LeasePdfParty;
	tenant: LeasePdfParty;
}

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INK = rgb(0.13, 0.13, 0.15);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.82, 0.82, 0.85);

/**
 * Reduce arbitrary user text to characters the WinAnsi-encoded standard fonts
 * can render -- pdf-lib throws on un-encodable code points (emoji, CJK, the
 * 0x7F-0x9F C1 gap, ...), so any tenant name / address must be sanitized first.
 * Common typographic punctuation is folded to ASCII; everything outside
 * printable ASCII + the Latin-1 supplement is collapsed to '?'.
 */
function pdfSafe(text: string | null | undefined): string {
	return (text ?? "")
		.replace(/[‐-―]/g, "-")
		.replace(/[‘’‚‛]/g, "'")
		.replace(/[“”„‟]/g, '"')
		.replace(/…/g, "...")
		.replace(/[^\t\n\r\x20-\x7E\u00A0-\u00FF]/g, "?");
}

function formatStamp(iso: string | null): string {
	if (!iso) return "";
	// Stable, unambiguous UTC rendering for the audit trail.
	return `${new Date(iso).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/** Simple top-down layout cursor with auto-pagination. */
class Layout {
	private page: PDFPage;
	private y: number;

	constructor(
		private readonly doc: PDFDocument,
		private readonly font: PDFFont,
		private readonly bold: PDFFont,
	) {
		this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		this.y = PAGE_HEIGHT - MARGIN;
	}

	private ensure(space: number): void {
		if (this.y - space < MARGIN) {
			this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
			this.y = PAGE_HEIGHT - MARGIN;
		}
	}

	gap(h: number): void {
		this.y -= h;
	}

	title(text: string): void {
		this.ensure(40);
		const safe = pdfSafe(text);
		const size = 18;
		const w = this.bold.widthOfTextAtSize(safe, size);
		this.page.drawText(safe, {
			x: MARGIN + (CONTENT_WIDTH - w) / 2,
			y: this.y - size,
			size,
			font: this.bold,
			color: INK,
		});
		this.y -= size + 18;
	}

	heading(text: string): void {
		this.ensure(30);
		this.y -= 6;
		this.page.drawText(pdfSafe(text), {
			x: MARGIN,
			y: this.y - 12,
			size: 12,
			font: this.bold,
			color: INK,
		});
		this.y -= 16;
		this.page.drawLine({
			start: { x: MARGIN, y: this.y },
			end: { x: MARGIN + CONTENT_WIDTH, y: this.y },
			thickness: 0.75,
			color: RULE,
		});
		this.y -= 12;
	}

	/** Label/value row; the value wraps within the remaining width. */
	row(label: string, value: string): void {
		const size = 10.5;
		const labelW = 165;
		const valueX = MARGIN + labelW;
		const valueMaxW = CONTENT_WIDTH - labelW;
		const lines = this.wrap(pdfSafe(value || "-"), this.font, size, valueMaxW);
		this.ensure(lines.length * (size + 4) + 4);
		this.page.drawText(pdfSafe(label), {
			x: MARGIN,
			y: this.y - size,
			size,
			font: this.bold,
			color: MUTED,
		});
		for (const line of lines) {
			this.page.drawText(line, {
				x: valueX,
				y: this.y - size,
				size,
				font: this.font,
				color: INK,
			});
			this.y -= size + 4;
		}
		this.y -= 4;
	}

	/** Free paragraph spanning the full content width. */
	paragraph(text: string, opts?: { size?: number; color?: typeof INK }): void {
		const size = opts?.size ?? 10;
		const color = opts?.color ?? INK;
		const lines = this.wrap(pdfSafe(text), this.font, size, CONTENT_WIDTH);
		this.ensure(lines.length * (size + 4));
		for (const line of lines) {
			this.page.drawText(line, {
				x: MARGIN,
				y: this.y - size,
				size,
				font: this.font,
				color,
			});
			this.y -= size + 4;
		}
	}

	/** Signature block: name on a ruled line, with status / audit metadata. */
	signature(party: LeasePdfParty): void {
		this.ensure(72);
		const size = 11;
		this.y -= 20;
		this.page.drawLine({
			start: { x: MARGIN, y: this.y },
			end: { x: MARGIN + 260, y: this.y },
			thickness: 0.75,
			color: INK,
		});
		this.y -= 2;
		const signedLabel = party.signedAt
			? `${pdfSafe(party.name)}  (e-signed)`
			: "Awaiting signature";
		this.page.drawText(signedLabel, {
			x: MARGIN,
			y: this.y - size,
			size,
			font: this.font,
			color: party.signedAt ? INK : MUTED,
		});
		this.y -= size + 4;
		this.page.drawText(`${pdfSafe(party.label)} - ${pdfSafe(party.email)}`, {
			x: MARGIN,
			y: this.y - 9,
			size: 9,
			font: this.font,
			color: MUTED,
		});
		this.y -= 13;
		if (party.signedAt) {
			this.page.drawText(`Signed ${formatStamp(party.signedAt)}`, {
				x: MARGIN,
				y: this.y - 9,
				size: 9,
				font: this.font,
				color: MUTED,
			});
			this.y -= 13;
		}
		this.y -= 8;
	}

	private wrap(
		text: string,
		font: PDFFont,
		size: number,
		maxWidth: number,
	): string[] {
		const out: string[] = [];
		for (const rawLine of text.split("\n")) {
			const words = rawLine.split(/\s+/).filter(Boolean);
			if (words.length === 0) {
				out.push("");
				continue;
			}
			let line = "";
			for (const word of words) {
				const candidate = line ? `${line} ${word}` : word;
				if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
					out.push(line);
					line = word;
				} else {
					line = candidate;
				}
			}
			if (line) out.push(line);
		}
		return out.length > 0 ? out : [""];
	}
}

/**
 * Render the lease PDF. When both parties have a `signedAt`, an electronic
 * signature audit certificate is appended. Returns the raw PDF bytes.
 */
export async function renderLeasePdf(data: LeasePdfData): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	doc.setTitle("Residential Lease Agreement");
	doc.setProducer("TenantFlow");
	doc.setCreator("TenantFlow");

	const font = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);
	const l = new Layout(doc, font, bold);

	l.title("RESIDENTIAL LEASE AGREEMENT");

	l.heading("Property");
	l.row("Property", data.propertyLabel);
	if (data.unitNumber) l.row("Unit", data.unitNumber);

	l.heading("Lease Terms");
	l.row("Start Date", data.startDate);
	l.row("End Date", data.endDate);
	l.row("Monthly Rent", data.rent);
	l.row("Security Deposit", data.securityDeposit);
	if (data.governingState) l.row("Governing State", data.governingState);

	if (data.landlordNoticeAddress || data.immediateFamilyMembers) {
		l.heading("Additional Terms");
		if (data.landlordNoticeAddress)
			l.row("Landlord Notice Address", data.landlordNoticeAddress);
		if (data.immediateFamilyMembers)
			l.row("Immediate Family Members", data.immediateFamilyMembers);
	}

	l.heading("Parties");
	l.row("Property Owner / Landlord", data.owner.name);
	l.row("Tenant", data.tenant.name);

	l.heading("Signatures");
	l.signature(data.owner);
	l.signature(data.tenant);

	const bothSigned = !!data.owner.signedAt && !!data.tenant.signedAt;
	if (bothSigned) {
		l.heading("Electronic Signature Audit Certificate");
		l.paragraph(
			"This document was executed electronically under the U.S. ESIGN Act (15 U.S.C. 7001) and applicable state UETA. Each party affirmatively consented to sign electronically and clicked to adopt their signature. The records below evidence the signing events.",
			{ size: 9, color: MUTED },
		);
		l.gap(8);
		for (const party of [data.owner, data.tenant]) {
			l.row(`${party.label} signed`, formatStamp(party.signedAt));
			l.row("IP address", party.ip ?? "n/a");
			l.row("User agent", party.userAgent ?? "n/a");
			l.row("Method", party.method ?? "n/a");
			l.gap(6);
		}
		l.paragraph(
			"A SHA-256 integrity hash of this finalized document is recorded in TenantFlow's system of record. Any later modification of these bytes will not match that hash.",
			{ size: 9, color: MUTED },
		);
	}

	return doc.save();
}
