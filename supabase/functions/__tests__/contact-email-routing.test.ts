/**
 * The contact form's email reaches support@ and can be answered with Reply.
 *
 * The owner set support@ as the one public address (2026-11-24 audit D-07) and
 * follows up demo and call requests by email (F5). send-contact-email sent to
 * sales@ with the noreply sender as the only reply path. It is a Deno module
 * Vitest cannot import, so its source is read as text.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		"../send-contact-email/index.ts",
	),
	"utf8",
);

describe("send-contact-email routing", () => {
	it("sends to the shared support inbox", () => {
		expect(SOURCE).toMatch(
			/import \{ SUPPORT_EMAIL \} from "\.\.\/_shared\/email-layout\.ts";/,
		);
		expect(SOURCE).toMatch(/const CONTACT_INBOX = SUPPORT_EMAIL;/);
		expect(SOURCE).not.toMatch(/sales@tenantflow\.app/);
	});

	it("replies go to the visitor who wrote", () => {
		const send = SOURCE.slice(SOURCE.indexOf("await sendEmail({"));
		expect(send).toMatch(/\n\t+replyTo: email,\n/);
	});
});
