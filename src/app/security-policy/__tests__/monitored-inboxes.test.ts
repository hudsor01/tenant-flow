/**
 * Regression pins for TRUST-03 / TRUST-04.
 *
 * /security-policy § 7 "Contact & Monitored Inboxes" documents the two
 * monitored inboxes (security@, sales@) and their response SLAs. These
 * tests fail if a future edit drops either inbox, the section heading,
 * or either SLA from src/app/security-policy/page.tsx.
 *
 * Pure source-text scan — no DOM, so no jsdom environment.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TRUST-03/04: monitored-inbox documentation", () => {
	const src = readFileSync(resolve(__dirname, "..", "page.tsx"), "utf8");

	it("/security-policy documents the security@ monitored inbox", () => {
		expect(src, "security@tenantflow.app is not documented").toContain(
			"security@tenantflow.app",
		);
	});

	it("/security-policy documents the sales@ monitored inbox", () => {
		expect(src, "sales@tenantflow.app is not documented").toContain(
			"sales@tenantflow.app",
		);
	});

	it("documents the 'Contact & Monitored Inboxes' section", () => {
		expect(
			src,
			"the Contact & Monitored Inboxes section heading is missing",
		).toMatch(/Contact &amp; Monitored Inboxes/);
	});

	it("documents the security@ 24-hour acknowledgement SLA", () => {
		expect(src, "the security@ 24-hour acknowledgement SLA is missing").toMatch(
			/Acknowledged within 24 hours/,
		);
	});

	it("documents the sales@ 1-business-day response SLA", () => {
		expect(src, "the sales@ 1-business-day response SLA is missing").toMatch(
			/within 1 business day/,
		);
	});
});
