/**
 * @vitest-environment jsdom
 * One "Account scheduled for deletion" notice (66.2-39 fix round 4, G28/G29).
 * The Data tab's Danger Zone and the canceled-subscription section each kept
 * a copy, with the date helpers beside it, and both copies held the base `p`
 * margin: the two lines 16px apart where `mt-1` declares 4, and 33px under
 * them inside the box against 17 above. Both render this component now.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeletionScheduledNotice } from "#components/settings/deletion-scheduled-notice";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

const SECTIONS = [
	"src/components/settings/account-data-section.tsx",
	"src/components/settings/gdpr-data-actions.tsx",
];

describe("DeletionScheduledNotice", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	// The job runs the first night after the date, and waits while a lease is
	// active; it never deletes the account itself (Part 8i). The notice said
	// "Your account will be permanently deleted on <date>".
	it("names the earliest date the job runs and the days until it, 30 days after the request", () => {
		render(
			<DeletionScheduledNotice deletionRequestedAt="2026-11-01T12:00:00Z" />,
		);
		expect(
			screen.getByText("Account scheduled for deletion"),
		).toBeInTheDocument();
		const body = screen.getByText(/Deletion runs on or after/);
		expect(body.textContent).toBe(
			"Deletion runs on or after December 1, 2026, in 24 days. If a lease is still active then, it waits until none is. You can cancel until it runs.",
		);
	});

	// Past the date (a lease still active, or before that night's run) the
	// notice counted negative days: "You have -6 days remaining to cancel."
	it("says the deletion is due, not a negative count, once the date has passed", () => {
		render(
			<DeletionScheduledNotice deletionRequestedAt="2026-09-01T12:00:00Z" />,
		);
		const body = screen.getByText(/Deletion was due on/);
		expect(body.textContent).toBe(
			"Deletion was due on October 1, 2026. It runs on the first night no lease is active. You can cancel until it runs.",
		);
		expect(body.textContent).not.toMatch(/-\d/);
	});

	it("leaves no base paragraph margin on either line", () => {
		render(
			<DeletionScheduledNotice deletionRequestedAt="2026-11-01T12:00:00Z" />,
		);
		for (const line of [
			screen.getByText("Account scheduled for deletion"),
			screen.getByText(/Deletion runs on or after/),
		]) {
			const { neutralized, baseline } = computeParagraphCascade(line);
			expect(baseline.marginBottom).toBe("16px");
			expect(neutralized.marginBottom).toBe("0px");
		}
	});

	it("is the notice both Danger Zones render, with no copy of its helpers", () => {
		for (const file of SECTIONS) {
			const source = readFileSync(join(process.cwd(), file), "utf8");
			expect(source, file).toContain("<DeletionScheduledNotice");
			expect(source, file).not.toContain("Account scheduled for deletion");
			expect(source, file).not.toMatch(
				/function (formatDeletionDate|daysRemaining)\b/,
			);
		}
	});
});
