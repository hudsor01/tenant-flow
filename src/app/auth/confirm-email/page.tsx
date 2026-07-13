"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GridPattern } from "#components/ui/grid-pattern";
import { logger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/client";
import {
	ConfirmEmailActions,
	ConfirmEmailErrorBanner,
	ConfirmEmailFooter,
	ConfirmEmailHeader,
	ConfirmEmailImagePanel,
	ConfirmEmailInstructions,
	ConfirmEmailMobileLogo,
} from "./confirm-email-states";

const RESEND_COOLDOWN_SECONDS = 60;

/** Basic email-shape check — the resend address must at least look like one. */
function isEmailShape(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ConfirmEmailContent() {
	const [isResending, setIsResending] = useState(false);
	const [cooldownSeconds, setCooldownSeconds] = useState(0);
	const [fetchedEmail, setFetchedEmail] = useState<string | null>(null);
	const [manualEmail, setManualEmail] = useState("");
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const searchParams = useSearchParams();
	const errorParam = searchParams.get("error");

	// AUTH-03: resolve the resend address in priority order — (a) the `email`
	// query param the login form forwards, (b) a logged-in-but-unconfirmed
	// user's own email, (c) manual entry. The page's traffic is pre-confirmation
	// (no session), so the old getUser()-only gate always aborted.
	const emailParam = searchParams.get("email");
	const paramEmail = emailParam && isEmailShape(emailParam) ? emailParam : null;

	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	// Fallback (b): only fetch the current user when no valid param was passed.
	useEffect(() => {
		if (paramEmail) return;
		let ignore = false;
		void (async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!ignore && user?.email) setFetchedEmail(user.email);
		})();
		return () => {
			ignore = true;
		};
	}, [paramEmail]);

	const showEmailInput = !paramEmail && !fetchedEmail;
	const resolvedEmail =
		paramEmail ??
		fetchedEmail ??
		(isEmailShape(manualEmail) ? manualEmail : null);

	const startCooldown = () => {
		setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
		intervalRef.current = setInterval(() => {
			setCooldownSeconds((prev) => {
				if (prev <= 1) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const handleResendEmail = async () => {
		if (cooldownSeconds > 0) return;
		if (!resolvedEmail) {
			toast.error("Enter your email", {
				description: "Add the email address you signed up with to resend.",
			});
			return;
		}
		setIsResending(true);
		try {
			const supabase = createClient();
			// `resend` needs no session — only the email. This is the exact
			// audience the page serves (pre-confirmation, unauthenticated).
			const { error } = await supabase.auth.resend({
				type: "signup",
				email: resolvedEmail,
			});
			if (error) throw error;
			toast.success("Email sent!", {
				description: "Check your inbox for the confirmation link.",
			});
			startCooldown();
		} catch (error) {
			logger.error("Failed to resend confirmation email", {
				action: "resend_confirmation_email_failed",
				metadata: {
					error: error instanceof Error ? error.message : "Unknown error",
				},
			});
			toast.error("Failed to resend email", {
				description:
					error instanceof Error
						? error.message
						: "Please try again or contact support.",
			});
		} finally {
			setIsResending(false);
		}
	};

	const isDisabled = isResending || cooldownSeconds > 0;

	function getResendButtonText(): string {
		if (isResending) return "Sending...";
		if (cooldownSeconds > 0) return `Resend Email (${cooldownSeconds}s)`;
		return "Resend Email";
	}

	return (
		<div className="relative min-h-screen flex flex-col lg:flex-row">
			<GridPattern
				patternId="confirm-email-grid"
				className="fixed inset-0 -z-10"
			/>
			<ConfirmEmailImagePanel />
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
				<div className="w-full max-w-md space-y-8">
					<ConfirmEmailMobileLogo />
					{errorParam === "invalid_token" && <ConfirmEmailErrorBanner />}
					<ConfirmEmailHeader />
					<ConfirmEmailInstructions />
					<ConfirmEmailActions
						isResending={isResending}
						isDisabled={isDisabled}
						buttonText={getResendButtonText()}
						onResend={handleResendEmail}
						showEmailInput={showEmailInput}
						email={manualEmail}
						onEmailChange={setManualEmail}
					/>
					<ConfirmEmailFooter />
				</div>
			</div>
		</div>
	);
}

export default function ConfirmEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex-center bg-background">
					<div className="text-center space-y-4">
						<div className="size-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</div>
			}
		>
			<ConfirmEmailContent />
		</Suspense>
	);
}
