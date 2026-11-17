import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStandardWebhook } from "../_shared/standard-webhooks";

// A secret in the shape Supabase shows in Auth Hooks: `v1,whsec_<base64>`.
const KEY = Buffer.from("tenantflow-auth-hook-test-key-32b", "utf8");
const SECRET = `v1,whsec_${KEY.toString("base64")}`;
const OTHER_SECRET = `v1,whsec_${Buffer.from("another-key-entirely-0123456789", "utf8").toString("base64")}`;
const NOW = 1_794_860_000;
const ID = "msg_2Xk9fG7hQ";
const BODY = JSON.stringify({ user: { email: "owner@example.com" }, email_data: {} });

/** Signs like Supabase does, computed independently with Node's crypto. */
function sign(id: string, timestamp: number, body: string, key = KEY): string {
	return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

function verify(overrides: {
	body?: string;
	id?: string | null;
	timestamp?: string | null;
	signature?: string | null;
	secrets?: string;
	now?: number;
}) {
	return verifyStandardWebhook({
		body: overrides.body ?? BODY,
		headers: {
			id: overrides.id === undefined ? ID : overrides.id,
			timestamp: overrides.timestamp === undefined ? String(NOW) : overrides.timestamp,
			signature:
				overrides.signature === undefined ? sign(ID, NOW, BODY) : overrides.signature,
		},
		secrets: overrides.secrets ?? SECRET,
		nowSeconds: overrides.now ?? NOW,
	});
}

describe("verifyStandardWebhook", () => {
	it("accepts a request signed with the secret", async () => {
		await expect(verify({})).resolves.toEqual({ ok: true });
	});

	it("accepts the secret without the v1, prefix and when one of several signatures matches", async () => {
		await expect(verify({ secrets: `whsec_${KEY.toString("base64")}` })).resolves.toEqual({
			ok: true,
		});
		await expect(
			verify({ signature: `v1,AAAA ${sign(ID, NOW, BODY)}` }),
		).resolves.toEqual({ ok: true });
	});

	it("accepts any secret of a rotation list", async () => {
		await expect(verify({ secrets: `${OTHER_SECRET}|${SECRET}` })).resolves.toEqual({
			ok: true,
		});
	});

	it("allows five minutes of clock skew either way, and no more", async () => {
		await expect(verify({ now: NOW + 300 })).resolves.toEqual({ ok: true });
		await expect(verify({ now: NOW - 300 })).resolves.toEqual({ ok: true });
		await expect(verify({ now: NOW + 301 })).resolves.toEqual({
			ok: false,
			reason: "stale_timestamp",
		});
	});

	it.each([
		["a changed body", { body: `${BODY} ` }],
		["a changed id", { id: "msg_other" }],
		["a signature from another key", { signature: sign(ID, NOW, BODY, Buffer.from("x")) }],
		["the wrong secret", { secrets: OTHER_SECRET }],
		["a signature without the v1, prefix", { signature: sign(ID, NOW, BODY).slice(3) }],
	])("refuses %s", async (_label, overrides) => {
		await expect(verify(overrides)).resolves.toEqual({ ok: false, reason: "no_match" });
	});

	it.each([
		["the id", { id: null }],
		["the timestamp", { timestamp: null }],
		["the signature", { signature: null }],
	])("refuses a request missing %s", async (_label, overrides) => {
		await expect(verify(overrides)).resolves.toEqual({
			ok: false,
			reason: "missing_headers",
		});
	});

	it("refuses a timestamp that is not whole seconds", async () => {
		await expect(verify({ timestamp: `${NOW}.5` })).resolves.toEqual({
			ok: false,
			reason: "bad_timestamp",
		});
	});

	it.each(["", "v1,whsec_", "v1,whsec_!!not-base64!!", "  "])(
		"refuses every request when the secret is %j",
		async (secrets) => {
			await expect(verify({ secrets })).resolves.toEqual({
				ok: false,
				reason: "bad_secret",
			});
		},
	);
});
