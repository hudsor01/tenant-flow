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

	doc.setFont(FONT, "bold");
	doc.setFontSize(12);
	doc.setTextColor(0);
	doc.text(section.heading, margin, y);
	y += 14;

	if (section.rows && section.rows.length > 0) {
		doc.setFont(FONT, "normal");
		doc.setFontSize(10);
		const labelX = margin;
		const valueX = pageWidth / 2;
		for (const row of section.rows) {
			if (y > bottom) {
				doc.addPage();
				y = margin + 10;
			}
			doc.setTextColor(80);
			doc.text(String(row.label), labelX, y);
			doc.setTextColor(0);
			doc.text(String(row.value), valueX, y);
			y += 16;
		}
		y += 6;
	}

	if (section.table && section.table.rows.length > 0) {
		autoTable(doc, {
			startY: y,
			head: [section.table.headers],
			body: section.table.rows.map((r) => r.map((c) => String(c))),
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
		const lastTable = (
			doc as unknown as { lastAutoTable?: { finalY?: number } }
		).lastAutoTable;
		y = (lastTable?.finalY ?? y) + 20;
	} else if (section.table) {
		// Empty table — render placeholder row
		doc.setFont(FONT, "italic");
		doc.setFontSize(9);
		doc.setTextColor(120);
		doc.text("No data for the selected period.", margin, y);
		y += 16;
	}

	if (section.note) {
		if (y > bottom) {
			doc.addPage();
			y = margin + 10;
		}
		doc.setFont(FONT, "italic");
		doc.setFontSize(8);
		doc.setTextColor(120);
		doc.text(section.note, margin, y);
		y += 14;
	}

	return y + 8;
}
