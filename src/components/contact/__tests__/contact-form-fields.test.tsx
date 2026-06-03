import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactFormFields } from "#components/contact/contact-form-fields";
import type { ContactFormRequest } from "#types/domain";

const baseFormData: ContactFormRequest = {
	name: "",
	email: "",
	subject: "",
	message: "",
	type: "general",
};

describe("CONS-08: /contact 'How did you hear about us?' placeholder", () => {
	// The "How did you hear about us?" Select is name="referralSource",
	// bound to formData.type. With type:"general" no <SelectItem> value
	// matches (the options are search/social/referral/sales/conference/
	// other), so the trigger sits in its placeholder state — no selected
	// label is rendered into the trigger's value span.
	//
	// Radix `SelectValue` does NOT render its placeholder STRING into the
	// DOM under jsdom (placeholder display is computed via a layout effect
	// tied to the live selected item). So the render assertion pins the
	// observable placeholder STATE: the #type trigger renders no selected
	// label. The exact "Please select" literal is pinned by the
	// source-text test below.
	it("the 'How did you hear about us?' select renders no hardcoded default selection", () => {
		const { container } = render(
			<ContactFormFields
				formData={baseFormData}
				errors={{}}
				onInputChange={() => {}}
			/>,
		);
		const trigger = container.querySelector("#type");
		expect(
			trigger,
			"the referralSource select trigger (#type) did not render",
		).not.toBeNull();
		// Placeholder state: none of the six SelectItem labels leaks into
		// the trigger as a hardcoded default.
		const triggerText = trigger?.textContent ?? "";
		for (const label of [
			"Google Search",
			"Social Media",
			"Referral",
			"Sales Outreach",
			"Conference/Event",
			"Other",
		]) {
			expect(
				triggerText,
				`the referralSource trigger shows a hardcoded "${label}" default instead of the placeholder`,
			).not.toContain(label);
		}
	});

	it("contact-form-fields.tsx uses the 'Please select' placeholder literal", () => {
		const src = readFileSync(
			resolve(__dirname, "..", "contact-form-fields.tsx"),
			"utf8",
		);
		expect(
			src,
			"the 'Please select' SelectValue placeholder is missing",
		).toMatch(/placeholder="Please select"/);
		expect(
			src,
			"the killed 'Sales Outreach' default must not be a placeholder",
		).not.toMatch(/placeholder="Sales Outreach"/);
	});

	// The component shows the placeholder only while formData.type holds no
	// value that matches a referral option. The live form's default lives in
	// contact-form.tsx — pin it to a non-matching value so the placeholder
	// survives in production (type:"sales" regressed it to "Sales Outreach").
	it("contact-form.tsx does not default `type` to a matching referral option", () => {
		const src = readFileSync(
			resolve(__dirname, "..", "contact-form.tsx"),
			"utf8",
		);
		expect(
			src,
			"the contact form default must not pre-select 'sales' (renders as 'Sales Outreach')",
		).not.toMatch(/type:\s*["']sales["']/);
		expect(src, "the contact form must default `type` to 'general'").toMatch(
			/type:\s*["']general["']/,
		);
	});
});
