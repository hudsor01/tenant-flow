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

	it("names the deletion date and the days left, 30 days after the request", () => {
		render(
			<DeletionScheduledNotice deletionRequestedAt="2026-11-01T12:00:00Z" />,
		);
		expect(
			screen.getByText("Account scheduled for deletion"),
		).toBeInTheDocument();
		const body = screen.getByText(/permanently deleted on/);
		expect(body.textContent).toBe(
			"Your account will be permanently deleted on December 1, 2026. You have 24 days remaining to cancel.",
		);
	});

	it("leaves no base paragraph margin on either line", () => {
		render(
			<DeletionScheduledNotice deletionRequestedAt="2026-11-01T12:00:00Z" />,
		);
		for (const line of [
			screen.getByText("Account scheduled for deletion"),
			screen.getByText(/permanently deleted on/),
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
