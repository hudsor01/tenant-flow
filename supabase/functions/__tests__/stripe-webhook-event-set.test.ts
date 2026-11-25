/**
 * The webhook router handles exactly the events the Stripe endpoint sends.
 *
 * The endpoint (Tenant Flow account, `we_1T7PmlP3WCR53SdoEOYKJOUj`) was
 * narrowed on 2026-11-24 from 89 event types to these 7. Every other type fell
 * to the router's `default`, which files a Sentry warning per event. A handler
 * added here must also be added to the endpoint in the Stripe Dashboard
 * (Workbench, Webhooks), and one removed there must leave here, or events are
 * either never delivered or warned about on every delivery.
 *
 * The router is a Deno module Vitest cannot import, so its source is read as
 * text, as `checkout-branding.test.ts` reads stripe-checkout.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROUTER = readFileSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		"../stripe-webhooks/index.ts",
	),
	"utf8",
);

const ENDPOINT_EVENTS = [
	"checkout.session.completed",
	"checkout.session.expired",
	"customer.subscription.created",
	"customer.subscription.deleted",
	"customer.subscription.trial_will_end",
	"customer.subscription.updated",
	"invoice.payment_failed",
];

describe("stripe-webhooks routes the endpoint's event set", () => {
	it("has a case for exactly the events the endpoint sends", () => {
		const cases = [...ROUTER.matchAll(/\n\t+case "([a-z_.]+)":/g)].map(
			(m) => m[1],
		);
		expect([...cases].sort()).toEqual(ENDPOINT_EVENTS);
	});

	it("acknowledges an abandoned checkout without the unhandled-type warning", () => {
		expect(ROUTER).toMatch(/case "checkout\.session\.expired":\n\t+break;/);
	});
});
