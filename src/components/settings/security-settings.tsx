"use client";

import Link from "next/link";
import { ActiveSessionsSection } from "#components/settings/sections/active-sessions-section";
import { PasswordSection } from "#components/settings/sections/password-section";
import { TwoFactorSection } from "#components/settings/sections/two-factor-section";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import { useMfaStatus } from "#hooks/api/use-mfa";
import { useUserSessions } from "#hooks/api/use-sessions";

export function SecuritySettings() {
	const { isLoading: mfaLoading } = useMfaStatus();
	const { isLoading: sessionsLoading } = useUserSessions();

	const isLoading = mfaLoading || sessionsLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-48 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Security Settings</h2>
					<p className="text-sm text-muted-foreground">
						Manage your password and authentication methods
					</p>
				</div>
			</BlurFade>

			<PasswordSection />
			<TwoFactorSection />
			<ActiveSessionsSection />

			{/* GDPR export + account-deletion live exclusively on the My
			    Data tab now (Session 11 P2 #9: duplicating the danger
			    affordance across Security and My Data increased the chance
			    of mistaken clicks). Leave a pointer here. */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-4">
					<p className="text-sm text-muted-foreground">
						Account deletion and data export moved to the{" "}
						<Link
							href="/settings?tab=data"
							className="text-primary-text hover:underline underline-offset-4"
						>
							My Data
						</Link>{" "}
						tab.
					</p>
				</section>
			</BlurFade>
		</div>
	);
}
