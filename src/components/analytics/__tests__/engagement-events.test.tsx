/**
 * @vitest-environment jsdom
 *
 * The engagement events recorded at their call sites (2026-11-24 SEO audit
 * 3b): an FAQ opened (P14), a resource printed (RS8, M10).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("#lib/analytics/track", () => ({ track }));

import { FaqsAccordion } from "#components/faq-accordion";
import { PricingFaqItem } from "#components/pricing/pricing-faq-item";
import { PrintButton } from "#components/shared/print-button";

beforeEach(() => track.mockClear());

describe("faq_open", () => {
	it("records the question when an FAQ opens, not when it closes", () => {
		render(
			<FaqsAccordion
				trackLocation="faq"
				faqs={[{ question: "Is there a free trial?", answer: "Yes." }]}
			/>,
		);
		const question = screen.getByRole("button", { name: /free trial/i });
		fireEvent.click(question);
		expect(track).toHaveBeenCalledWith({
			name: "faq_open",
			props: { question: "Is there a free trial?", location: "faq" },
		});
		fireEvent.click(question);
		expect(track).toHaveBeenCalledTimes(1);
	});

	it("records a pricing FAQ opening, trimming a long question to 120 characters", () => {
		const long = `${"Why ".repeat(40)}?`;
		render(<PricingFaqItem question={long} answer="Because." />);
		fireEvent.click(screen.getByRole("button"));
		expect(track).toHaveBeenCalledWith({
			name: "faq_open",
			props: { question: long.slice(0, 120), location: "pricing" },
		});
	});
});

describe("resource_print", () => {
	it("records the resource, then opens the print dialog", () => {
		const print = vi.spyOn(window, "print").mockImplementation(() => {});
		render(<PrintButton resource="tax-deduction-tracker" />);
		fireEvent.click(screen.getByRole("button", { name: /print/i }));
		expect(track).toHaveBeenCalledWith({
			name: "resource_print",
			props: { resource: "tax-deduction-tracker" },
		});
		expect(print).toHaveBeenCalled();
		print.mockRestore();
	});
});
