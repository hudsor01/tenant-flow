"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import { createClient } from "#lib/supabase/client";
import { signupFormSchema } from "#lib/validation/auth";
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
	const supabase = createClient();

	const form = useForm({
		defaultValues: {
			first_name: "",
			last_name: "",
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				const { first_name, last_name, email, password } = value;
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: { first_name, last_name, planIntent: planName },
						emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
				const message =
					err instanceof Error ? err.message : "Unable to complete sign up";
				toast.error("Sign up failed", { description: message });
			} finally {
				setIsSubmitting(false);
			}
		},
		validators: { onSubmit: signupFormSchema },
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
					<DialogDescription>
						Create your account to start your 14-day free trial. No credit card
						required.
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
