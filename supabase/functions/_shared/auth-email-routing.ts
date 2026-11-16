// Turns a Supabase Send Email hook payload into the emails to send: who gets
// which email, with which link or code. Keep this file import-free and
// Deno-free: tsc compiles it for the Vitest tests under
// supabase/functions/__tests__/.
//
// Payload reference: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

/** Every email the hook can be asked to send, with what its template needs. */
export type AuthEmailMessage =
	| { kind: "signup"; to: string; url: string }
	| { kind: "invite"; to: string; url: string; inviterName?: string }
	| { kind: "magiclink"; to: string; url: string }
	| { kind: "recovery"; to: string; url: string }
	| {
			kind: "email_change";
			to: string;
			url: string;
			email: string;
			newEmail: string;
	  }
	| { kind: "reauthentication"; to: string; code: string }
	| { kind: "password_changed"; to: string; signInUrl: string }
	| { kind: "email_changed"; to: string; oldEmail: string; signInUrl: string }
	| {
			kind: "phone_changed";
			to: string;
			phone: string;
			oldPhone: string;
			signInUrl: string;
	  }
	| {
			kind: "identity_linked" | "identity_unlinked";
			to: string;
			provider: string;
			signInUrl: string;
	  }
	| {
			kind: "mfa_enrolled" | "mfa_unenrolled";
			to: string;
			factorType: string;
			signInUrl: string;
	  };

export type AuthEmailPlan =
	| { ok: true; actionType: string; messages: AuthEmailMessage[] }
	| { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty string field, or "" when it is missing or not a string. */
function text(record: Record<string, unknown>, key: string): string {
	const value = record[key];
	return typeof value === "string" ? value.trim() : "";
}

/**
 * The app's auth callback, which verifies `token_hash` and routes by `type`
 * (src/app/auth/callback/route.ts).
 */
function callbackUrl(appUrl: string, tokenHash: string, type: string): string {
	return `${appUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}

/**
 * Plans the emails for one hook call. `appUrl` is the app's origin
 * (NEXT_PUBLIC_APP_URL). Returns `ok: false` when the payload lacks what the
 * action needs, so the hook answers with an error instead of sending a
 * broken email.
 */
export function planAuthEmails(
	payload: unknown,
	appUrl: string,
): AuthEmailPlan {
	if (!isRecord(payload)) return { ok: false, reason: "payload_not_object" };
	const user = payload.user;
	const data = payload.email_data;
	if (!isRecord(user) || !isRecord(data)) {
		return { ok: false, reason: "missing_user_or_email_data" };
	}

	const base = appUrl.replace(/\/+$/, "");
	const email = text(user, "email");
	const actionType = text(data, "email_action_type");
	const tokenHash = text(data, "token_hash");
	const signInUrl = `${base}/login`;
	const plan = (messages: AuthEmailMessage[]): AuthEmailPlan => ({
		ok: true,
		actionType,
		messages,
	});
	const missing = (field: string): AuthEmailPlan => ({
		ok: false,
		reason: `${actionType || "unknown_action"}: missing ${field}`,
	});

	if (!actionType) return missing("email_action_type");

	// Every action except email_change goes to the account's current address.
	if (actionType !== "email_change" && !email) return missing("user.email");

	switch (actionType) {
		case "signup":
			if (!tokenHash) return missing("token_hash");
			return plan([
				{
					kind: "signup",
					to: email,
					url: callbackUrl(base, tokenHash, "email"),
				},
			]);
		case "invite": {
			if (!tokenHash) return missing("token_hash");
			const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
			const inviterName = text(metadata, "inviter_name");
			return plan([
				{
					kind: "invite",
					to: email,
					url: callbackUrl(base, tokenHash, "invite"),
					...(inviterName ? { inviterName } : {}),
				},
			]);
		}
		case "magiclink":
		case "email":
			if (!tokenHash) return missing("token_hash");
			return plan([
				{
					kind: "magiclink",
					to: email,
					url: callbackUrl(base, tokenHash, "magiclink"),
				},
			]);
		case "recovery":
			if (!tokenHash) return missing("token_hash");
			return plan([
				{
					kind: "recovery",
					to: email,
					url: callbackUrl(base, tokenHash, "recovery"),
				},
			]);
		case "email_change": {
			// The hash names are reversed for backward compatibility:
			// token_hash_new belongs with the CURRENT address and token_hash
			// with the NEW one. With Secure Email Change on, both are present
			// and each address gets its own link; with it off, only the new
			// address gets one.
			const newEmail = text(user, "new_email");
			const tokenHashNew = text(data, "token_hash_new");
			if (!newEmail) return missing("user.new_email");
			if (!tokenHash) return missing("token_hash");
			const toNew: AuthEmailMessage = {
				kind: "email_change",
				to: newEmail,
				url: callbackUrl(base, tokenHash, "email_change"),
				email,
				newEmail,
			};
			if (!tokenHashNew) return plan([toNew]);
			if (!email) return missing("user.email");
			return plan([
				{
					kind: "email_change",
					to: email,
					url: callbackUrl(base, tokenHashNew, "email_change"),
					email,
					newEmail,
				},
				toNew,
			]);
		}
		case "reauthentication": {
			const code = text(data, "token");
			if (!code) return missing("token");
			return plan([{ kind: "reauthentication", to: email, code }]);
		}
		case "password_changed_notification":
			return plan([{ kind: "password_changed", to: email, signInUrl }]);
		case "email_changed_notification": {
			const oldEmail = text(data, "old_email");
			if (!oldEmail) return missing("old_email");
			return plan([{ kind: "email_changed", to: email, oldEmail, signInUrl }]);
		}
		case "phone_changed_notification": {
			const phone = text(user, "phone");
			const oldPhone = text(data, "old_phone");
			if (!phone || !oldPhone) return missing("phone or old_phone");
			return plan([
				{ kind: "phone_changed", to: email, phone, oldPhone, signInUrl },
			]);
		}
		case "identity_linked_notification":
		case "identity_unlinked_notification": {
			const provider = text(data, "provider");
			if (!provider) return missing("provider");
			return plan([
				{
					kind:
						actionType === "identity_linked_notification"
							? "identity_linked"
							: "identity_unlinked",
					to: email,
					provider,
					signInUrl,
				},
			]);
		}
		case "mfa_factor_enrolled_notification":
		case "mfa_factor_unenrolled_notification": {
			const factorType = text(data, "factor_type");
			if (!factorType) return missing("factor_type");
			return plan([
				{
					kind:
						actionType === "mfa_factor_enrolled_notification"
							? "mfa_enrolled"
							: "mfa_unenrolled",
					to: email,
					factorType,
					signInUrl,
				},
			]);
		}
		default:
			return {
				ok: false,
				reason: `unsupported email_action_type: ${actionType}`,
			};
	}
}
