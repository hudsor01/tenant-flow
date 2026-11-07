/**
 * The lease wizard's card pads itself as the v4 Card does (66.2-39 fix round
 * 3, the G4 sweep): its CardContent carried the v3 `pt-6` on top of the
 * Card's own `py-6`, 48px above the step and 24px below it.
 */
import { describe, expect, it, vi } from "vitest";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { render } from "#test/utils/test-render";

vi.mock("../selection-step", () => ({ SelectionStep: () => null }));
vi.mock("../terms-step", () => ({ TermsStep: () => null }));
vi.mock("../details-step", () => ({ DetailsStep: () => null }));
vi.mock("../review-step", () => ({ ReviewStep: () => null }));
vi.mock("#hooks/use-unsaved-changes", () => ({
	useUnsavedChangesWarning: () => undefined,
}));

import { LeaseCreationWizard } from "../lease-creation-wizard";

describe("the lease wizard's card", () => {
	it("adds no padding of its own above the step", async () => {
		render(<LeaseCreationWizard />);
		const content = document.querySelector("[data-slot=card-content]");
		if (!content) throw new Error("the wizard rendered no card content");
		const designSystem = await loadProjectDesignSystem();
		const css = designSystem
			.candidatesToCss([...content.classList])
			.filter((rule): rule is string => rule !== null)
			.join("\n");
		expect(css).toContain("padding-inline");
		expect(css).not.toMatch(/padding(-top|-block)?\s*:/);
	});
});
