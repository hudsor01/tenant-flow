/**
 * PDF writer for ReportData. Uses jsPDF + jspdf-autotable.
 *
 * Layout: portrait Letter, 0.5" margins, 14pt title, 10pt subtitle, sections
 * laid out vertically with auto-pagination via autoTable's didDrawPage hook.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData, ReportSection } from "./report-data";

const FONT = "helvetica";

interface DocWithAutoTable extends jsPDF {
	lastAutoTable?: { finalY?: number };
}

export function generatePdfBlob(report: ReportData): Blob {
	const doc = new jsPDF({
		unit: "pt",
		format: "letter",
		orientation: "portrait",
	});
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 36; // 0.5"

	// Header
	doc.setFont(FONT, "bold");
	doc.setFontSize(18);
	doc.text(report.title, margin, margin + 6);

	doc.setFont(FONT, "normal");
	doc.setFontSize(10);
	doc.setTextColor(100);
	doc.text(report.subtitle, margin, margin + 26);
	doc.text(
		`Generated ${new Date(report.generatedAt).toLocaleString("en-US")}`,
		margin,
		margin + 40,
	);
	doc.setDrawColor(220);
	doc.line(margin, margin + 50, pageWidth - margin, margin + 50);
	doc.setTextColor(0);

	let cursorY = margin + 70;

	for (const section of report.sections) {
		cursorY = renderSection(doc, section, cursorY, margin, pageWidth);
	}

	// Footer on every page
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(150);
		doc.text(
			`TenantFlow · ${report.title} · Page ${i} of ${pageCount}`,
			margin,
			doc.internal.pageSize.getHeight() - 18,
		);
	}

	return doc.output("blob");
}

function renderSectionHeading(
	doc: jsPDF,
	heading: string,
	x: number,
	y: number,
): number {
	doc.setFont(FONT, "bold");
	doc.setFontSize(12);
	doc.setTextColor(0);
	doc.text(heading, x, y);
	return y + 14;
}

function renderSummaryRows(
	doc: jsPDF,
	rows: NonNullable<ReportSection["rows"]>,
	startY: number,
	margin: number,
	valueX: number,
	bottom: number,
): number {
	doc.setFont(FONT, "normal");
	doc.setFontSize(10);
	let y = startY;
	for (const row of rows) {
		if (y > bottom) {
			doc.addPage();
			y = margin + 10;
		}
		doc.setTextColor(80);
		doc.text(String(row.label), margin, y);
		doc.setTextColor(0);
		doc.text(String(row.value), valueX, y);
		y += 16;
	}
	return y + 6;
}

function renderSectionTable(
	doc: jsPDF,
	table: NonNullable<ReportSection["table"]>,
	startY: number,
	margin: number,
): number {
	if (table.rows.length === 0) {
		// The builder's words for the section, or nothing when the section's
		// note says why the table is empty.
		if (table.emptyText === null) return startY;
		doc.setFont(FONT, "italic");
		doc.setFontSize(9);
		doc.setTextColor(120);
		doc.text(table.emptyText, margin, startY);
		return startY + 16;
	}
	autoTable(doc, {
		startY,
		head: [table.headers],
		body: table.rows.map((r) => r.map((c) => String(c))),
		theme: "striped",
		styles: { font: FONT, fontSize: 9, cellPadding: 4 },
		headStyles: {
			fillColor: [33, 102, 245],
			textColor: 255,
			fontStyle: "bold",
		},
		alternateRowStyles: { fillColor: [248, 250, 252] },
		margin: { left: margin, right: margin },
	});
	// autoTable mutates doc; pull current Y from internal lastAutoTable
	const lastTable = (doc as DocWithAutoTable).lastAutoTable;
	return (lastTable?.finalY ?? startY) + 20;
}

/**
 * Text wrapped to the width between the margins, one line at a time, onto a
 * new page when a line would pass the bottom. Each line is split by jsPDF's own
 * measure of the font (splitTextToSize), so none runs past the right margin.
 * Returns the y below the last line.
 */
export function renderWrappedText(
	doc: jsPDF,
	text: string,
	x: number,
	startY: number,
	maxWidth: number,
	lineHeight: number,
	margin: number,
	bottom: number,
): number {
	let y = startY;
	const lines: string[] = doc.splitTextToSize(text, maxWidth);
	for (const line of lines) {
		if (y > bottom) {
			doc.addPage();
			y = margin + 10;
		}
		doc.text(line, x, y);
		y += lineHeight;
	}
	return y;
}

function renderSectionNote(
	doc: jsPDF,
	note: string,
	x: number,
	startY: number,
	maxWidth: number,
	margin: number,
	bottom: number,
): number {
	doc.setFont(FONT, "italic");
	doc.setFontSize(8);
	doc.setTextColor(120);
	return (
		renderWrappedText(doc, note, x, startY, maxWidth, 10, margin, bottom) + 4
	);
}

function renderSectionParagraphs(
	doc: jsPDF,
	paragraphs: readonly string[],
	x: number,
	startY: number,
	maxWidth: number,
	margin: number,
	bottom: number,
): number {
	doc.setFont(FONT, "normal");
	doc.setFontSize(9);
	doc.setTextColor(60);
	let y = startY;
	for (const paragraph of paragraphs) {
		y =
			renderWrappedText(doc, paragraph, x, y, maxWidth, 12, margin, bottom) + 6;
	}
	doc.setTextColor(0);
	return y;
}

function renderSection(
	doc: jsPDF,
	section: ReportSection,
	startY: number,
	margin: number,
	pageWidth: number,
): number {
	let y = startY;
	const pageHeight = doc.internal.pageSize.getHeight();
	const bottom = pageHeight - margin - 24;

	if (y > bottom - 60) {
		doc.addPage();
		y = margin + 10;
	}

	y = renderSectionHeading(doc, section.heading, margin, y);

	if (section.rows && section.rows.length > 0) {
		y = renderSummaryRows(doc, section.rows, y, margin, pageWidth / 2, bottom);
	}

	if (section.table) {
		y = renderSectionTable(doc, section.table, y, margin);
	}

	const textWidth = pageWidth - margin * 2;
	if (section.paragraphs && section.paragraphs.length > 0) {
		y = renderSectionParagraphs(
			doc,
			section.paragraphs,
			margin,
			y,
			textWidth,
			margin,
			bottom,
		);
	}

	if (section.note) {
		y = renderSectionNote(
			doc,
			section.note,
			margin,
			y,
			textWidth,
			margin,
			bottom,
		);
	}

	return y + 8;
}
