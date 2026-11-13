/**
 * The detail page's contact links: a phone number as typed becomes a tel: link
 * of its digits (and a leading +); an email becomes a mailto: link.
 */
import { describe, expect, it } from "vitest";
import { mailtoHref, telHref } from "../maintenance-utils";

describe("the contact links", () => {
	it("dial a phone number's digits", () => {
		expect(telHref("(555) 010-2000")).toBe("tel:5550102000");
		expect(telHref("+1 555.010.2000")).toBe("tel:+15550102000");
	});

	it("make no link without something to dial or mail", () => {
		expect(telHref(null)).toBeUndefined();
		expect(telHref("")).toBeUndefined();
		expect(telHref("ext. only")).toBeUndefined();
		expect(mailtoHref(null)).toBeUndefined();
		expect(mailtoHref("")).toBeUndefined();
	});

	it("mail an email address", () => {
		expect(mailtoHref("jobs@aceplumbing.example")).toBe(
			"mailto:jobs@aceplumbing.example",
		);
	});
});
