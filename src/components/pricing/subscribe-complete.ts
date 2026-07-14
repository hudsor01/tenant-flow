/**
 * Shared completion handler for the owner subscribe dialog, used by both the
 * featured and standard pricing cards.
 *
 * The dialog reports `requiresEmailConfirmation` when Supabase signup produced
 * no session (email confirmations are on and the follow-up
 * `signInWithPassword` could not authenticate yet). In that state there is no
 * Bearer token, so calling `createCheckoutSession` would 401 and surface a
 * spurious "Failed to start checkout" toast for a signup that actually
 * succeeded. Branching on the flag skips checkout entirely and relies on the
 * dialog's own truthful "check your email" toast; the user resumes checkout
 * from /pricing after confirming (their plan intent is preserved in
 * `user_metadata.planIntent`).
 *
 * Extracting one handler removes the sibling-drift root cause: both cards
 * previously carried duplicated inline closures written before the flag
 * existed.
 */
export async function completeSubscribeSignup(
	payload: {
		email: string;
		tenant_id?: string;
		requiresEmailConfirmation?: boolean;
	},
	opts: {
		startCheckout: (overrides: {
			customerEmail: string;
			tenant_id?: string;
		}) => Promise<unknown>;
		closeDialog: () => void;
	},
): Promise<void> {
	if (payload.requiresEmailConfirmation) {
		opts.closeDialog();
		return;
	}
	await opts.startCheckout({
		customerEmail: payload.email,
		...(payload.tenant_id && { tenant_id: payload.tenant_id }),
	});
	opts.closeDialog();
}
