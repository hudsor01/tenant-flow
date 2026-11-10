/**
 * The move-out reason (66.2-39 fix round 4, Part 8j): "Mark as moved out"
 * saves `tenants.move_out_reason` as the reason's slug, or `slug: notes`, and
 * the tenant's page reads it back. The slugs and their labels are one list,
 * `MOVE_OUT_REASON_LABELS`, which the dialog and the page both read, and the
 * note the dialog takes keeps every slug's reason within the column's CHECK.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
	MOVE_OUT_NOTES_MAX_LENGTH,
	MOVE_OUT_REASON_LABELS,
	moveOutReasonText,
	readMoveOutReason,
} from "#lib/constants/status-types";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");
const LABELS_FILE = "src/lib/constants/status-types.ts";

/** The newest migration's `char_length(move_out_reason) <= N`. */
function columnLimit(): number {
	const limits = readdirSync(MIGRATIONS)
		.filter((name) => name.endsWith(".sql"))
		.sort()
		.flatMap((name) => {
			const sql = readFileSync(join(MIGRATIONS, name), "utf8");
			const match = /char_length\(\s*move_out_reason\s*\)\s*<=\s*(\d+)/.exec(
				sql,
			);
			return match ? [Number(match[1])] : [];
		});
	const limit = limits.at(-1);
	if (limit === undefined) {
		throw new Error("no migration bounds tenants.move_out_reason");
	}
	return limit;
}

function sources(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...sources(path));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.test\.tsx?$/.test(entry.name)
		) {
			out.push(relative(ROOT, path));
		}
	}
	return out;
}

describe("the move-out reason", () => {
	it("keeps the longest slug, its separator and a full note within the column's limit", () => {
		const limit = columnLimit();
		expect(limit).toBe(2000);
		const note = "n".repeat(MOVE_OUT_NOTES_MAX_LENGTH);
		const lengths = Object.keys(MOVE_OUT_REASON_LABELS).map(
			(slug) => moveOutReasonText(slug, note).length,
		);
		// Every reason fits, and the longest slug's fills the column exactly.
		expect(Math.max(...lengths)).toBe(limit);
		expect(MOVE_OUT_NOTES_MAX_LENGTH).toBe(1981);
	});

	it("saves the slug alone, or the slug and the trimmed notes", () => {
		expect(moveOutReasonText("eviction", "")).toBe("eviction");
		expect(moveOutReasonText("eviction", "   \n ")).toBe("eviction");
		expect(moveOutReasonText("relocation", "  took a job in Denver \n")).toBe(
			"relocation: took a job in Denver",
		);
	});

	it("reads each slug back as its label, with its notes", () => {
		for (const [slug, label] of Object.entries(MOVE_OUT_REASON_LABELS)) {
			expect(readMoveOutReason(slug)).toEqual({ label, notes: null });
			expect(readMoveOutReason(moveOutReasonText(slug, "a: b"))).toEqual({
				label,
				notes: "a: b",
			});
		}
	});

	it("shows a reason whose slug is not in the list whole, as written", () => {
		expect(readMoveOutReason("moved_in_with_family")).toEqual({
			label: "moved_in_with_family",
			notes: null,
		});
		expect(readMoveOutReason("Moved to Florida: new job")).toEqual({
			label: "Moved to Florida: new job",
			notes: null,
		});
	});

	it("is the one list: no other source names a move-out slug or its own label", () => {
		const hits = [...sources(join(ROOT, "src"))]
			.filter(
				(path) => path !== LABELS_FILE && path !== "src/types/supabase.ts",
			)
			.flatMap((path) =>
				readFileSync(join(ROOT, path), "utf8")
					.split("\n")
					.flatMap((line, index) =>
						/\b(lease_expired|early_termination)\b|Purchased Property|<SelectItem value="(eviction|purchase|relocation)"/.test(
							line,
						)
							? [`${path}:${index + 1} ${line.trim()}`]
							: [],
					),
			);
		expect(hits, hits.join("\n")).toEqual([]);
	});
});
