"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import {
	userPreferencesKeys,
	userPreferencesQueries,
} from "#hooks/api/query-keys/user-preferences-keys";
import { profileKeys, useProfile } from "#hooks/api/use-profile";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import {
	useDataDensity,
	usePreferencesStore,
} from "#providers/preferences-provider";
import type { DataDensity } from "#stores/preferences-store";
import type { ThemeMode } from "#types/domain";
import { OwnerEmergencyContactSection } from "./owner-emergency-contact-section";

export function GeneralSettings() {
	const themeMode = usePreferencesStore((state) => state.themeMode);
	const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
	const { dataDensity, setDataDensity } = useDataDensity();

	// Fetch current user profile via shared hook
	const { data: profile, isLoading: profileLoading } = useProfile();

	// FORMFIX-06: Timezone + Language live on the `user_preferences` table
	// (NOT `users`). Load the saved values so the selects reflect reality
	// instead of the hardcoded defaults.
	const { data: preferences, isLoading: preferencesLoading } = useQuery(
		userPreferencesQueries.detail(),
	);

	const [contactEmail, setContactEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [timezone, setTimezone] = useState("America/Chicago");
	const [language, setLanguage] = useState("en-US");

	// Seed Contact Email + Phone from the users profile when it loads.
	useEffect(() => {
		if (profile?.email) {
			setContactEmail(profile.email);
		}
		if (profile?.phone) {
			setPhone(profile.phone);
		}
	}, [profile]);

	// Seed Timezone + Language from user_preferences when it loads.
	useEffect(() => {
		if (preferences) {
			setTimezone(preferences.timezone);
			setLanguage(preferences.language);
		}
	}, [preferences]);

	const queryClient = useQueryClient();

	// Update profile mutation (Phone → `users`). Email is NOT written here — it is a
	// locked privileged column (REVOKE UPDATE on public.users + the
	// guard_user_self_update trigger reject it); it goes through Auth (updateEmail).
	const updateProfile = useMutation({
		mutationFn: async (updates: { phone?: string }) => {
			const supabase = createClient();
			const user = await getCachedUser();
			if (!user) throw new Error("Not authenticated");
			const { error } = await supabase
				.from("users")
				.update(updates)
				.eq("id", user.id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
			toast.success("Profile updated successfully");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to update profile",
			);
		},
	});

	// Contact (account) email → Supabase Auth. `public.users.email` is a locked
	// privileged column that cannot be written via PostgREST, so an email change is
	// an auth operation: it sends a confirmation link and only takes effect once the
	// user confirms (the users.email is then synced from auth).
	const updateEmail = useMutation({
		mutationFn: async (email: string) => {
			const supabase = createClient();
			const { error } = await supabase.auth.updateUser({ email });
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success(
				"Check your inbox — we sent a link to confirm your new email.",
			);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to update email",
			);
		},
	});

	// Update preferences mutation (Timezone + Language → `user_preferences`),
	// upsert by user_id (onConflict "user_id") mirroring the notification
	// settings upsert. The user_id is stamped from the auth-derived user,
	// never from client input (T-31-06-01).
	const updatePreferences = useMutation({
		mutationFn: async (updates: { timezone: string; language: string }) => {
			const supabase = createClient();
			const user = await getCachedUser();
			if (!user) throw new Error("Not authenticated");
			const { error } = await supabase.from("user_preferences").upsert(
				{
					user_id: user.id,
					timezone: updates.timezone,
					language: updates.language,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: userPreferencesKeys.all });
			toast.success("Preferences updated successfully");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to update preferences",
			);
		},
	});

	const handleThemeChange = (value: string) => {
		setThemeMode(value as ThemeMode);
	};

	const handleDensityChange = (value: string) => {
		setDataDensity(value as DataDensity);
	};

	const handleSaveChanges = () => {
		let changed = false;

		// Phone → `users`.
		const profileUpdates: { phone?: string } = {};
		if (phone !== (profile?.phone ?? "")) {
			profileUpdates.phone = phone;
		}
		if (Object.keys(profileUpdates).length > 0) {
			updateProfile.mutate(profileUpdates);
			changed = true;
		}

		// Contact (account) email → Auth (locked column; confirmation flow). Guard
		// against wiping it with a blank value — only send when non-empty and changed.
		if (contactEmail && contactEmail !== profile?.email) {
			updateEmail.mutate(contactEmail);
			changed = true;
		}

		// Timezone + Language → `user_preferences`.
		if (
			timezone !== preferences?.timezone ||
			language !== preferences?.language
		) {
			updatePreferences.mutate({ timezone, language });
			changed = true;
		}

		if (!changed) {
			toast.info("No changes to save");
		}
	};

	const isLoading = profileLoading || preferencesLoading;
	const isSaving =
		updateProfile.isPending ||
		updatePreferences.isPending ||
		updateEmail.isPending;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-64 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">General Settings</h2>
					<p className="text-sm text-muted-foreground">
						Manage your business profile and preferences
					</p>
				</div>
			</BlurFade>

			{/* Contact Info */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Contact Info
					</h3>

					<div className="space-y-4">
						<div className="grid gap-2">
							<label htmlFor="contactEmail" className="text-sm font-medium">
								Contact Email
							</label>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<input
									id="contactEmail"
									type="email"
									value={contactEmail}
									onChange={(e) => setContactEmail(e.target.value)}
									placeholder="contact@example.com"
									className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<label htmlFor="phone" className="text-sm font-medium">
								Phone Number
							</label>
							<div className="flex items-center gap-2">
								<Smartphone className="h-4 w-4 text-muted-foreground" />
								<input
									id="phone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="(555) 123-4567"
									className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
							</div>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Preferences */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Preferences
					</h3>

					<div className="space-y-4">
						{/* Theme — Session 11 P3 #32: label associated via
						    htmlFor/id so screen readers announce the field
						    name and the rendered option matches themeMode. */}
						<div className="grid gap-2">
							<label htmlFor="preference-theme" className="text-sm font-medium">
								Theme
							</label>
							<select
								id="preference-theme"
								value={themeMode}
								onChange={(e) => handleThemeChange(e.target.value)}
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							>
								<option value="system">System</option>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
							</select>
						</div>

						{/* Data Density */}
						<div className="grid gap-2">
							<label
								htmlFor="preference-density"
								className="text-sm font-medium"
							>
								Data Density
							</label>
							<select
								id="preference-density"
								value={dataDensity}
								onChange={(e) => handleDensityChange(e.target.value)}
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							>
								<option value="compact">Compact</option>
								<option value="comfortable">Comfortable</option>
								<option value="spacious">Spacious</option>
							</select>
							<p className="text-xs text-muted-foreground">
								Controls spacing and row heights in tables and lists
							</p>
						</div>

						{/* Timezone */}
						<div className="grid gap-2">
							<label
								htmlFor="preference-timezone"
								className="text-sm font-medium"
							>
								Timezone
							</label>
							<select
								id="preference-timezone"
								value={timezone}
								onChange={(e) => setTimezone(e.target.value)}
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							>
								<option value="America/Los_Angeles">
									America/Los_Angeles (PST)
								</option>
								<option value="America/Denver">America/Denver (MST)</option>
								<option value="America/Chicago">America/Chicago (CST)</option>
								<option value="America/New_York">America/New_York (EST)</option>
							</select>
						</div>

						{/* Language */}
						<div className="grid gap-2">
							<label
								htmlFor="preference-language"
								className="text-sm font-medium"
							>
								Language
							</label>
							<select
								id="preference-language"
								value={language}
								onChange={(e) => setLanguage(e.target.value)}
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							>
								<option value="en-US">English (US)</option>
								<option value="es">Spanish (ES)</option>
								<option value="fr">French (FR)</option>
							</select>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Save Button */}
			<BlurFade delay={0.35} inView>
				<div className="flex justify-end">
					<button
						onClick={handleSaveChanges}
						disabled={isSaving}
						className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						{isSaving ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</span>
						) : (
							"Save Changes"
						)}
					</button>
				</div>
			</BlurFade>

			{/* Emergency Contact (F-3 from 2026-05-03 audit) */}
			<BlurFade delay={0.4} inView>
				<OwnerEmergencyContactSection />
			</BlurFade>
		</div>
	);
}
