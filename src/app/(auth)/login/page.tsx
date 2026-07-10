"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Home, Lock, Smartphone, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ForgotPasswordModal } from "#components/auth/forgot-password-modal";
import { MfaVerificationDialog } from "#components/auth/mfa-verification-dialog";
import { authKeys } from "#hooks/api/use-auth";
import { createLogger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/client";
import { requiresMfaStepUp } from "#lib/supabase/mfa-assurance";
import { LoginForm } from "./login-form";
import { LoginOAuth } from "./login-oauth";

const logger = createLogger({ component: "LoginPage" });

const HERO_STATS = [
	{ value: "Vault", lines: ["Document", "Storage"] },
	{ value: "E-Sign", lines: ["Built-in", "Signing"] },
	{ value: "Reports", lines: ["Tax-ready", "Exports"] },
];

/** AUTH-12: Prevent open redirect attacks including protocol-relative URLs. */
function isValidRedirect(redirect: string): boolean {
	if (!redirect.startsWith("/") || redirect.startsWith("//")) return false;
	try {
		const url = new URL(redirect, window.location.origin);
		return url.hostname === window.location.hostname;
	} catch {
		return false;
	}
}

function LoginPageContent() {
	const [authError, setAuthError] = useState<string | null>(null);
	const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
	const [showMfaDialog, setShowMfaDialog] = useState(false);
	const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
	const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const router = useRouter();
	const queryClient = useQueryClient();

	// F1: read URL params lazily from window.location instead of
	// useSearchParams(). useSearchParams() forces a prerender bailout that ships
	// only the "Loading..." Suspense fallback in the initial HTML (no form). The
	// params are only needed in this client-only effect + the submit handler, so
	// reading them lazily lets the whole form render server-side into the HTML.
	useEffect(() => {
		const error = new URLSearchParams(window.location.search).get("error");
		if (error === "oauth_failed") {
			router.replace("/login");
		}
	}, [router]);

	// SEC-01: when the proxy redirects an aal1 session for an MFA-enrolled
	// user here (→ /login?redirect=…), open the OTP challenge on mount
	// instead of showing the password form — the password was already
	// accepted; only step-up remains. Mirrors the submit-handler aal dance.
	useEffect(() => {
		let ignore = false;
		void (async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (ignore || !user) return;

			const { data: aalData } =
				await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
			if (
				ignore ||
				!requiresMfaStepUp({
					currentLevel: aalData?.currentLevel ?? null,
					nextLevel: aalData?.nextLevel ?? null,
				})
			) {
				return;
			}

			const { data: factorsData } = await supabase.auth.mfa.listFactors();
			if (ignore) return;
			const totpFactor = factorsData?.totp?.find(
				(f) => f.status === "verified",
			);
			if (!totpFactor) return;

			const redirectTo = new URLSearchParams(window.location.search).get(
				"redirect",
			);
			const destination =
				redirectTo && isValidRedirect(redirectTo) ? redirectTo : "/dashboard";
			setPendingRedirect(destination);
			setMfaFactorId(totpFactor.id);
			setShowMfaDialog(true);
		})();
		return () => {
			ignore = true;
		};
	}, []);

	const handleCredentialSubmit = async (value: {
		email: string;
		password: string;
	}) => {
		setAuthError(null);
		setIsSubmitting(true);

		try {
			const supabase = createClient();
			const { data, error } = await supabase.auth.signInWithPassword({
				email: value.email,
				password: value.password,
			});

			if (error) {
				logger.error("[LOGIN_FAILED]", { error: error.message });
				if (error.message.includes("Email not confirmed")) {
					router.push("/auth/confirm-email");
					throw new Error("Please confirm your email before signing in.");
				}
				throw new Error(
					error.message === "Invalid login credentials"
						? "Invalid email or password."
						: error.message,
				);
			}

			if (data.session?.user) {
				logger.info("[LOGIN_SUCCESS]", { userId: data.session.user.id });

				// CRITICAL: Update query cache BEFORE navigating to prevent race condition
				queryClient.setQueryData(authKeys.session(), data.session);
				queryClient.setQueryData(authKeys.user(), data.session.user);

				const redirectTo = new URLSearchParams(window.location.search).get(
					"redirect",
				);
				let destination = "/dashboard";

				if (redirectTo && isValidRedirect(redirectTo)) {
					destination = redirectTo;
				}

				// Check if MFA verification is required
				const { data: aalData } =
					await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

				if (aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2") {
					logger.info("[MFA_REQUIRED]", { userId: data.session.user.id });
					const { data: factorsData } = await supabase.auth.mfa.listFactors();
					const totpFactor = factorsData?.totp?.find(
						(f) => f.status === "verified",
					);

					if (totpFactor) {
						setPendingRedirect(destination);
						setMfaFactorId(totpFactor.id);
						setShowMfaDialog(true);
						return;
					}
				}

				logger.info("[LOGIN_REDIRECT]", { destination });
				router.push(destination);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Please try again";
			setAuthError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleMfaSuccess = () => {
		logger.info("[MFA_VERIFIED]", { destination: pendingRedirect });
		setShowMfaDialog(false);
		if (pendingRedirect) router.push(pendingRedirect);
	};

	const handleMfaCancel = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		setShowMfaDialog(false);
		setMfaFactorId(null);
		setPendingRedirect(null);
		setAuthError("Two-factor authentication is required to sign in.");
	};

	return (
		<>
			<div className="min-h-screen flex bg-background">
				{/* Image Section - Hidden on mobile */}
				<div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
					<div className="absolute inset-0 transform scale-105">
						<Image
							src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=2340&q=80"
							alt="Modern apartment building"
							fill
							sizes="50vw"
							className="object-cover"
							priority
						/>
					</div>
					<div className="absolute inset-0 bg-black/25" />
					<div className="absolute inset-0 flex-center">
						<div className="relative max-w-lg mx-auto px-8">
							<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />
							<div className="relative text-center space-y-6 py-12 px-8">
								<div className="size-16 mx-auto mb-8">
									<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-glass-light shadow-lg">
										<Home className="size-8 text-primary-foreground" />
									</div>
								</div>
								<h2 className="text-foreground font-bold text-xl">
									Welcome back
								</h2>
								<p className="text-muted-foreground max-w-md mx-auto text-base">
									Sign in to manage your properties, leases, maintenance, and
									the document vault.
								</p>
								<div className="grid grid-cols-3 gap-6 pt-6">
									{HERO_STATS.map((stat) => (
										<div key={stat.value} className="text-center">
											<div className="text-foreground font-bold mb-1 text-base">
												{stat.value}
											</div>
											<div className="text-muted-foreground text-xs font-medium">
												{stat.lines.map((line, i, arr) => (
													<span key={line}>
														{line}
														{i < arr.length - 1 && <br />}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Form Section */}
				<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 min-h-screen">
					<div className="w-full max-w-sm space-y-8">
						<div className="text-center space-y-4">
							<div className="size-14 mx-auto">
								<div className="w-full h-full bg-primary rounded-xl flex-center shadow-sm">
									<Home className="size-7 text-primary-foreground" />
								</div>
							</div>
							<div className="space-y-2">
								<h1 className="typography-h3 text-foreground">Welcome back</h1>
								<p className="text-muted-foreground text-sm">
									Sign in to manage your properties, leases, and the document
									vault.
								</p>
							</div>
						</div>
						<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border border-border/50">
							<p className="text-muted-foreground">
								<strong className="text-foreground">New to TenantFlow?</strong>{" "}
								<Link
									href="/pricing"
									className="text-primary-text hover:underline font-medium"
								>
									View plans
								</Link>{" "}
								— TenantFlow is landlord-only, so tenants don&apos;t need an
								account.
							</p>
						</div>

						{/* Credential Login Form */}
						<LoginForm
							authError={authError}
							isSubmitting={isSubmitting}
							onSubmit={handleCredentialSubmit}
							onForgotPassword={() => setForgotPasswordOpen(true)}
							onCreateAccount={() => router.push("/pricing")}
						/>

						{/* OAuth */}
						<LoginOAuth />

						{/* Trust Indicators */}
						<div className="text-center space-y-4 pt-4 border-t border-border/50">
							<p className="text-muted-foreground/80 text-xs font-medium">
								Built for landlords
							</p>
							<div className="flex-center flex-wrap gap-4 sm:gap-6 text-xs">
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Lock className="size-3" />
									<span className="font-medium hidden sm:inline">
										Encrypted at rest
									</span>
									<span className="font-medium sm:hidden">Secure</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Zap className="size-3" />
									<span className="font-medium">RLS isolation</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground/70">
									<Smartphone className="size-3" />
									<span className="font-medium hidden sm:inline">
										Mobile-friendly web
									</span>
									<span className="font-medium sm:hidden">Mobile</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<ForgotPasswordModal
				open={forgotPasswordOpen}
				onOpenChange={setForgotPasswordOpen}
			/>

			{mfaFactorId && (
				<MfaVerificationDialog
					open={showMfaDialog}
					onOpenChange={(next) => {
						// SEC-01: route every dismiss (Escape / backdrop / X) through
						// sign-out so a dismissed challenge cannot leave a usable aal1
						// session. handleMfaSuccess uses the controlled
						// setShowMfaDialog(false), which Radix does NOT report via
						// onOpenChange — so a successful verify won't double-signOut.
						if (!next) void handleMfaCancel();
					}}
					factorId={mfaFactorId}
					onSuccess={handleMfaSuccess}
					onCancel={handleMfaCancel}
				/>
			)}
		</>
	);
}

export default function LoginPage() {
	return <LoginPageContent />;
}
