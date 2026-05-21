/** @vitest-environment jsdom */

/**
 * Regression pins for TRUST-01 / TRUST-04.
 *
 * TRUST-01 ships exactly 2 real, attributed testimonials in
 * src/data/testimonials.ts (Janet Shur / 8 properties, Jacob Lear /
 * 13 properties). TRUST-04 wires them through the `sections/` variant
 * of TestimonialsSection, which gates on `testimonials.length === 0`.
 *
 * These tests fail if a future edit drops a real testimonial, strips a
 * quote/author/company field, fabricates a metric, adds a headshot
 * avatar, or breaks the component's empty-gate / real-quote render.
 *
 * NOTE: the `#data` path alias does not exist in tsconfig/package.json —
 * production code imports testimonials.ts via a relative path. This test
 * matches that, importing `../testimonials` rather than `#data/...`.
 */

import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { TestimonialsSection } from "../../components/sections/testimonials-section";
import { realTestimonials } from "../testimonials";

describe("TRUST-01: realTestimonials data shape", () => {
	it("ships at least 2 real, attributed testimonials", () => {
		// TRUST-01 reconciliation: REQUIREMENTS.md asks for ">=3"; exactly 2 real
		// attributed testimonials are shipped. Fabricating a 3rd is rejected (v1.0
		// honesty milestone). The 3rd is deferred until a real customer opts in.
		expect(
			realTestimonials.length,
			"realTestimonials must keep at least the 2 shipped real testimonials",
		).toBeGreaterThanOrEqual(2);
	});

	it("every testimonial has a non-empty quote, author, and property-count company", () => {
		for (const t of realTestimonials) {
			expect(t.quote.trim().length, `${t.author}: empty quote`).toBeGreaterThan(
				0,
			);
			expect(
				t.author.trim().length,
				"a testimonial has an empty author",
			).toBeGreaterThan(0);
			expect(
				t.company.trim().length,
				`${t.author}: empty company/property-count`,
			).toBeGreaterThan(0);
		}
	});

	it("no testimonial carries a fabricated metric field", () => {
		for (const t of realTestimonials) {
			expect(
				t.metric,
				`${t.author} carries a fabricated metric`,
			).toBeUndefined();
		}
	});

	it("no testimonial carries a headshot avatar (renders as initials)", () => {
		for (const t of realTestimonials) {
			expect(t.avatar, `${t.author} carries a headshot avatar`).toBeUndefined();
		}
	});
});

describe("TRUST-01: TestimonialsSection render gate", () => {
	it("renders nothing when testimonials is empty (length===0 gate)", () => {
		const { container } = render(
			React.createElement(TestimonialsSection, { testimonials: [] }),
		);
		expect(
			container,
			"TestimonialsSection must render nothing on []",
		).toBeEmptyDOMElement();
	});

	it("renders the real testimonial quotes when passed realTestimonials", () => {
		const { container } = render(
			React.createElement(TestimonialsSection, {
				testimonials: realTestimonials,
			}),
		);
		expect(
			container,
			"TestimonialsSection must render content on real data",
		).not.toBeEmptyDOMElement();
		const first = realTestimonials[0];
		expect(first, "realTestimonials[0] missing").toBeDefined();
		expect(
			container.textContent ?? "",
			"the first real testimonial quote did not render",
		).toContain(first?.quote ?? "");
	});
});
