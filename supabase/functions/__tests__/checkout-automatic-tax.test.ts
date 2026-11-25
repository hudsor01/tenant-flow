/**
 * Checkout turns on Stripe Tax for every subscription it creates.
 *
 * Tax is collected only where the Stripe account has a tax registration, so
 * the switch is safe with none; once a registration is added in the
 * Dashboard, checkout, renewals and portal plan changes are taxed without a
 * code change. An existing customer with no address makes Stripe reject the
 * session unless the collected billing address is saved to it, hence
 * `customer_update.address`. The source is read as text because the function
 * is a Deno module Vitest cannot import (as `checkout-branding.test.ts` does).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CHECKOUT = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "../stripe-checkout/index.ts"),
	"utf8",
);

const SESSION_CREATE = CHECKOUT.slice(
	CHECKOUT.indexOf("stripe.checkout.sessions.create({"),
);

describe("stripe-checkout calculates tax with Stripe Tax", () => {
	it("enables automatic tax on the session", () => {
		expect(SESSION_CREATE).toMatch(
			/\n\t\t\tautomatic_tax: \{ enabled: true \},\n/,
		);
	});

	it("saves the collected billing address to the existing customer", () => {
		expect(SESSION_CREATE).toMatch(
			/\n\t\t\tcustomer_update: \{ address: "auto" as const \},\n/,
		);
	});
});
