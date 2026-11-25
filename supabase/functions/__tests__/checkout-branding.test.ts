/**
 * The hosted checkout page is branded TenantFlow.
 *
 * The Stripe account is shared with another business, so without per-session
 * branding the page an owner meets when entering a card was headed by that
 * business's name. `stripe-checkout` sets `branding_settings` on every
 * session. The source is read as text because the function is a Deno module
 * Vitest cannot import (as `billing-email-claims.test.ts` reads it).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Paths are built with node:path: Vite rewrites a literal
// `new URL(<path>, import.meta.url)` into a non-file URL.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../..");
const CHECKOUT = readFileSync(join(HERE, "../stripe-checkout/index.ts"), "utf8");
const GLOBALS_CSS = readFileSync(join(REPO, "src/app/globals.css"), "utf8");

describe("stripe-checkout brands the hosted page as TenantFlow", () => {
	it("passes the branding on the session it creates", () => {
		expect(CHECKOUT).toMatch(/\n\t\t\tbranding_settings: CHECKOUT_BRANDING,\n/);
	});

	it("names TenantFlow at the top of the page", () => {
		expect(CHECKOUT).toMatch(/\tdisplay_name: "TenantFlow",\n/);
	});

	it("shows an icon that the app serves from public/", () => {
		const match = CHECKOUT.match(
			/icon: \{ type: "url" as const, url: "https:\/\/tenantflow\.app\/([^"]+)" \}/,
		);
		expect(match).not.toBeNull();
		const publicPath = join(REPO, "public", match?.[1] ?? "");
		expect(existsSync(publicPath)).toBe(true);
	});

	it("colors the button with the app's primary", () => {
		// --primary is oklch(0.54 0.23 257), #0064ef in sRGB; white text on it
		// is 5.16:1, above the 4.5:1 AA floor.
		expect(GLOBALS_CSS).toMatch(
			/\t--primary: oklch\(0\.54 0\.23 257\);/,
		);
		expect(CHECKOUT).toMatch(/\tbutton_color: "#0064ef",\n/);
	});
});
