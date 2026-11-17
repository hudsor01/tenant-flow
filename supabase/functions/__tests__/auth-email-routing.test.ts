import { describe, expect, it } from "vitest";
import { planAuthEmails } from "../_shared/auth-email-routing";

const APP = "https://tenantflow.app";
const LOGIN = `${APP}/login`;
const cb = (hash: string, type: string) =>
	`${APP}/auth/callback?token_hash=${hash}&type=${type}`;

function payload(
	actionType: string,
	data: Record<string, unknown> = {},
	user: Record<string, unknown> = {},
) {
	return {
		user: { email: "owner@example.com", user_metadata: {}, ...user },
		email_data: { email_action_type: actionType, ...data },
	};
}

describe("planAuthEmails: link emails", () => {
	it.each([
		["signup", "signup", "email"],
		["recovery", "recovery", "recovery"],
		["magiclink", "magiclink", "magiclink"],
		["email", "magiclink", "magiclink"],
		["invite", "invite", "invite"],
	])("%s sends one %s email linking the callback with type=%s", (action, kind, type) => {
		const plan = planAuthEmails(payload(action, { token_hash: "pkce_abc" }), APP);
		expect(plan).toEqual({
			ok: true,
			actionType: action,
			messages: [{ kind, to: "owner@example.com", url: cb("pkce_abc", type) }],
		});
	});

	it("URL-encodes the token hash and ignores a trailing slash on the app URL", () => {
		const plan = planAuthEmails(payload("recovery", { token_hash: "a b&c" }), `${APP}/`);
		expect(plan.ok && plan.messages[0]).toMatchObject({
			url: `${APP}/auth/callback?token_hash=a%20b%26c&type=recovery`,
		});
	});

	it("passes the inviter's name through for invites", () => {
		const plan = planAuthEmails(
			payload("invite", { token_hash: "h" }, { user_metadata: { inviter_name: "Sam" } }),
			APP,
		);
		expect(plan.ok && plan.messages[0]).toMatchObject({ inviterName: "Sam" });
	});

	it.each(["signup", "recovery", "magiclink", "invite"])(
		"refuses %s without a token hash",
		(action) => {
			expect(planAuthEmails(payload(action), APP)).toEqual({
				ok: false,
				reason: `${action}: missing token_hash`,
			});
		},
	);
});

describe("planAuthEmails: email change", () => {
	const user = { email: "old@example.com", new_email: "new@example.com" };

	it("with Secure Email Change, sends token_hash_new to the CURRENT address and token_hash to the NEW one", () => {
		const plan = planAuthEmails(
			payload("email_change", { token_hash: "for_new", token_hash_new: "for_current" }, user),
			APP,
		);
		expect(plan).toEqual({
			ok: true,
			actionType: "email_change",
			messages: [
				{
					kind: "email_change",
					to: "old@example.com",
					url: cb("for_current", "email_change"),
					email: "old@example.com",
					newEmail: "new@example.com",
				},
				{
					kind: "email_change",
					to: "new@example.com",
					url: cb("for_new", "email_change"),
					email: "old@example.com",
					newEmail: "new@example.com",
				},
			],
		});
	});

	it("without Secure Email Change, sends one email to the new address with token_hash", () => {
		const plan = planAuthEmails(payload("email_change", { token_hash: "only" }, user), APP);
		expect(plan.ok && plan.messages).toEqual([
			{
				kind: "email_change",
				to: "new@example.com",
				url: cb("only", "email_change"),
				email: "old@example.com",
				newEmail: "new@example.com",
			},
		]);
	});

	it("refuses an email change with no new address", () => {
		expect(
			planAuthEmails(payload("email_change", { token_hash: "h" }), APP),
		).toEqual({ ok: false, reason: "email_change: missing user.new_email" });
	});
});

describe("planAuthEmails: codes and notices", () => {
	it("sends the reauthentication code", () => {
		const plan = planAuthEmails(payload("reauthentication", { token: "482913" }), APP);
		expect(plan.ok && plan.messages).toEqual([
			{ kind: "reauthentication", to: "owner@example.com", code: "482913" },
		]);
	});

	it.each([
		["password_changed_notification", {}, {}, { kind: "password_changed" }],
		[
			"email_changed_notification",
			{ old_email: "was@example.com" },
			{},
			{ kind: "email_changed", oldEmail: "was@example.com" },
		],
		[
			"phone_changed_notification",
			{ old_phone: "+15550199" },
			{ phone: "+15550142" },
			{ kind: "phone_changed", phone: "+15550142", oldPhone: "+15550199" },
		],
		[
			"identity_linked_notification",
			{ provider: "google" },
			{},
			{ kind: "identity_linked", provider: "google" },
		],
		[
			"identity_unlinked_notification",
			{ provider: "google" },
			{},
			{ kind: "identity_unlinked", provider: "google" },
		],
		[
			"mfa_factor_enrolled_notification",
			{ factor_type: "totp" },
			{},
			{ kind: "mfa_enrolled", factorType: "totp" },
		],
		[
			"mfa_factor_unenrolled_notification",
			{ factor_type: "totp" },
			{},
			{ kind: "mfa_unenrolled", factorType: "totp" },
		],
	])("%s sends its notice to the account address", (action, data, user, expected) => {
		const plan = planAuthEmails(payload(action, data, user), APP);
		expect(plan.ok && plan.messages).toEqual([
			{ to: "owner@example.com", signInUrl: LOGIN, ...expected },
		]);
	});

	it.each([
		["reauthentication", "token"],
		["email_changed_notification", "old_email"],
		["phone_changed_notification", "phone or old_phone"],
		["identity_linked_notification", "provider"],
		["mfa_factor_enrolled_notification", "factor_type"],
	])("refuses %s without %s", (action, field) => {
		expect(planAuthEmails(payload(action), APP)).toEqual({
			ok: false,
			reason: `${action}: missing ${field}`,
		});
	});
});

describe("planAuthEmails: bad payloads", () => {
	it.each([
		["a non-object", "nope", "payload_not_object"],
		["a payload without email_data", { user: {} }, "missing_user_or_email_data"],
		["a payload without an action", { user: { email: "a@b.c" }, email_data: {} }, "unknown_action: missing email_action_type"],
		["a payload without the user's email", payload("recovery", { token_hash: "h" }, { email: "" }), "recovery: missing user.email"],
		["an unknown action", payload("carrier_pigeon", { token_hash: "h" }), "unsupported email_action_type: carrier_pigeon"],
	])("refuses %s", (_label, input, reason) => {
		expect(planAuthEmails(input, APP)).toEqual({ ok: false, reason });
	});
});
