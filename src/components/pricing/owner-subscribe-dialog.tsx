"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { track } from "#lib/analytics/track";
import { useAppForm } from "#lib/forms/form-hook";
import { userFacingErrorMessage } from "#lib/mutation-error-handler";
import { subscribeFormOptions } from "./owner-subscribe-form-options";
import { SubscribeFormFields } from "./owner-subscribe-plan-selector";

interface OwnerSubscribeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: (payload: {
		email: string;
		tenant_id?: string;
		requiresEmailConfirmation?: boolean;
	}) => Promise<void> | void;
	planName?: string;
	planCta?: string;
}

export function OwnerSubscribeDialog({
	open,
	onOpenChange,
	onComplete,
	planName,
	planCta,
}: OwnerSubscribeDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Funnel step (SEO audit T1): the signup form is in front of a visitor.
	useEffect(() => {
		if (open) {
			track({ name: "signup_started", props: { plan: planName ?? "none" } });
		}
	}, [open, planName]);

	const form = useAppForm({
		...subscribeFormOptions,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				// Loaded on submit, so the pricing page ships no supabase-js
				// until a visitor signs up (2026-11-24 SEO audit S1).
				const { createClient } = await import("#lib/supabase/client");
				const supabase = createClient();
				const { first_name, last_name, email, password } = value;
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: { first_name, last_name, planIntent: planName },
						// AUTH-11: /auth/confirm does not exist — the real callback route
						// is /auth/callback (handles both the PKCE `code` and token_hash
						// shapes). Inert while the auth-email-send hook overrides links,
						// but correct under default Supabase templates.
						emailRedirectTo: `${window.location.origin}/auth/callback`,
					},
				});
				if (error) throw error;

				let requiresEmailConfirmation = !data.session;
				let supabaseuser_id = data.user?.id;
				if (!data.session) {
					const { data: signInData, error: signInError } =
						await supabase.auth.signInWithPassword({ email, password });
					if (!signInError) {
						requiresEmailConfirmation = false;
						supabaseuser_id = signInData.user?.id ?? supabaseuser_id;
					} else {
						const isConfirmationError =
							signInError?.code === "email_not_confirmed" ||
							(signInError?.status &&
								(signInError.status === 400 || signInError.status === 401)) ||
							(signInError?.message &&
								/confirm|email not confirmed/i.test(signInError.message));
						if (!isConfirmationError) throw signInError;
					}
				}
				track({
					name: "signup_completed",
					props: {
						plan: planName ?? "none",
						confirmed: !requiresEmailConfirmation,
					},
				});
				await onComplete({
					email,
					...(supabaseuser_id && { tenant_id: supabaseuser_id }),
					requiresEmailConfirmation,
				});
				toast.success("Account created", {
					description: requiresEmailConfirmation
						? "Check your email to confirm your account before first sign in."
						: "You are signed in and ready to continue.",
				});
				form.reset();
				onOpenChange(false);
			} catch (err) {
				toast.error("Sign up failed", {
					description: userFacingErrorMessage(
						err,
						"Unable to complete sign up",
					),
				});
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	const handleCancel = () => {
		if (!isSubmitting) {
			form.reset();
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg" intent="create">
				<DialogHeader>
					<DialogTitle>
						Join TenantFlow {planName ? `· ${planName}` : ""}
					</DialogTitle>
					<DialogDescription className="mb-0">
						Create your account to start your 14-day free trial: 1 property and
						up to 5 units, no credit card required.
						{planName
							? ` ${planName}'s features start when you choose it at checkout.`
							: ""}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<SubscribeFormFields form={form} isSubmitting={isSubmitting} />
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={handleCancel}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || form.state.isSubmitting}
						>
							{isSubmitting ? "Creating account..." : planCta || "Continue"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default OwnerSubscribeDialog;
