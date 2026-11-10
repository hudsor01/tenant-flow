/**
 * @vitest-environment jsdom
 * The lease page's cards pad as the v4 Card does (66.2-39 fix round 3, the
 * G4 sweep). Its four metric tiles kept the v3 `CardContent className="p-4"`
 * inside the Card's own `py-6`: each figure stood 40px under the tile's top
 * and 56px above its bottom (the base `p` margin under it), where the tile
 * declares 16. The load-error card kept `p-6`: 48px above its icon and 64px
 * under its message, where it declares 24.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { detail } = vi.hoisted(() => ({
	detail: { fail: false },
}));

vi.mock("#hooks/api/query-keys/lease-keys", () => ({
	leaseQueries: {
		detail: () => ({
			queryKey: ["lease-card-padding", detail.fail],
			queryFn: async () => {
				if (detail.fail) throw new Error("network");
				return { ...DEFAULT_LEASE, id: "lease-1", tenant: null, unit: null };
			},
			retry: false,
		}),
	},
}));
vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useCancelSignatureRequestMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
}));
for (const [path, name] of [
	["../lease-details-tab", "LeaseDetailsTab"],
	["../lease-sidebar", "LeaseSidebar"],
	["../lease-terms-tab", "LeaseTermsTab"],
	["../lease-timeline-tab", "LeaseTimelineTab"],
	["#components/ledger/ledger-tab", "LedgerTab"],
	["#components/documents/documents-section", "DocumentsSection"],
	[
		"#components/leases/download-signed-lease-button",
		"DownloadSignedLeaseButton",
	],
	[
		"#components/leases/rent-increase-notice-dialog",
		"RentIncreaseNoticeDialog",
	],
	["#components/leases/send-for-signature-button", "SendForSignatureButton"],
	["#components/leases/sign-lease-button", "SignLeaseButton"],
] as const) {
	vi.doMock(path, () => ({ [name]: () => null }));
}

async function paddingOf(element: Element): Promise<string[]> {
	const designSystem = await loadProjectDesignSystem();
	return designSystem
		.candidatesToCss([...element.classList])
		.filter((rule): rule is string => rule !== null)
		.flatMap((rule) =>
			[...rule.matchAll(/(padding[\w-]*)\s*:\s*([^;]+);/g)].map(
				(match) => `${match[1]}: ${match[2]?.trim()}`,
			),
		);
}

function cardOf(element: Element): { card: Element; content: Element } {
	const content = element.closest("[data-slot=card-content]");
	const card = element.closest("[data-slot=card]");
	if (!content || !card) throw new Error("not inside a Card's CardContent");
	return { card, content };
}

function expectNoBaseMargin(paragraph: Element | null) {
	if (!paragraph) throw new Error("no paragraph");
	const { neutralized, baseline } = computeParagraphCascade(paragraph);
	expect(baseline.marginBottom).toBe("16px");
	expect(neutralized.marginBottom, paragraph.textContent ?? "").toBe("0px");
}

describe("the lease page's cards", () => {
	it("pads each metric tile 16px all round", async () => {
		detail.fail = false;
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-1" />);
		await screen.findByText("Monthly Rent");
		for (const label of [
			"Monthly Rent",
			"Security Deposit",
			"Payment Day",
			"Grace Period",
		]) {
			const { card, content } = cardOf(screen.getByText(label));
			expect(await paddingOf(card), label).toEqual([
				"padding-block: calc(var(--spacing) * 4)",
			]);
			expect(await paddingOf(content), label).toEqual([
				"padding-inline: calc(var(--spacing) * 4)",
			]);
			expectNoBaseMargin(content.querySelector("p"));
		}
	}, 30_000);

	it("pads the load-error card with the Card's own 24px", async () => {
		detail.fail = true;
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-1" />);
		const title = await screen.findByText("Unable to load lease");
		const { card, content } = cardOf(title);
		expect(await paddingOf(card)).toEqual([
			"padding-block: calc(var(--spacing) * 6)",
		]);
		expect(await paddingOf(content)).toEqual([
			"padding-inline: calc(var(--spacing) * 6)",
		]);
		expectNoBaseMargin(content.querySelector("p"));
	}, 30_000);
});
