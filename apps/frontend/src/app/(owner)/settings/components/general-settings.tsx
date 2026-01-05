'use client'

import { useState } from 'react'
import { Mail, Smartphone, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Skeleton } from '#components/ui/skeleton'
import {
	usePreferencesStore,
	useDataDensity
} from '#providers/preferences-provider'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import type { ThemeMode } from '@repo/shared/types/domain'
import type { DataDensity } from '#stores/preferences-store'

export function GeneralSettings() {
	const themeMode = usePreferencesStore(state => state.themeMode)
	const setThemeMode = usePreferencesStore(state => state.setThemeMode)
	const { dataDensity, setDataDensity } = useDataDensity()
	const supabase = createClient()

	// Fetch current user profile
	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ['user-profile'],
		queryFn: async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('users')
				.select('first_name, last_name, email, phone')
				.eq('id', user.id)
				.single()

			if (error) throw error
			return data
		},
		staleTime: 5 * 60 * 1000
	})

	// Fetch company profile from stripe_connected_accounts
	const { data: companyProfile, isLoading: companyLoading } = useQuery({
		queryKey: ['company-profile'],
		queryFn: async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('stripe_connected_accounts')
				.select('business_name, business_type')
				.eq('user_id', user.id)
				.maybeSingle()

			if (error) throw error
			return data
		},
		staleTime: 5 * 60 * 1000
	})

	// Derive display values directly from query data (no sync needed)
	const businessName = companyProfile?.business_name ?? ''
	const contactEmail = profile?.email ?? ''

	// Only track user edits for saveable fields
	const [phoneEdit, setPhoneEdit] = useState<string | null>(null)
	const phone = phoneEdit ?? profile?.phone ?? ''

	// UI-only preferences (not persisted to backend yet)
	const [timezone, setTimezone] = useState('America/Chicago')
	const [language, setLanguage] = useState('en-US')

	const queryClient = useQueryClient()

	// Update profile mutation
	const updateProfile = useMutation({
		mutationFn: async (updates: { phone?: string; email?: string }) => {
			return apiRequest('/api/v1/users/profile', {
				method: 'PATCH',
				body: JSON.stringify(updates)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-profile'] })
			toast.success('Profile updated successfully')
		},
		onError: error => {
			toast.error(
				error instanceof Error ? error.message : 'Failed to update profile'
			)
		}
	})

	const handleThemeChange = (value: string) => {
		setThemeMode(value as ThemeMode)
	}

	const handleDensityChange = (value: string) => {
		setDataDensity(value as DataDensity)
	}

	const handleSaveChanges = () => {
		// Only save if user made edits (phoneEdit is non-null)
		if (phoneEdit !== null && phoneEdit !== profile?.phone) {
			updateProfile.mutate({ phone: phoneEdit })
		} else {
			toast.info('No changes to save')
		}
	}

	const isLoading = profileLoading || companyLoading

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-64 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
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

			{/* Business Profile */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Business Profile
					</h3>

					<div className="space-y-4">
						<div className="grid gap-2">
							<label htmlFor="businessName" className="text-sm font-medium">
								Business Name
							</label>
							<input
								id="businessName"
								type="text"
								value={businessName}
								readOnly
								placeholder="Your business name"
								className="h-10 rounded-lg border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
							/>
							<p className="text-xs text-muted-foreground">
								Business name is managed through Stripe Connect
							</p>
						</div>

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
									readOnly
									placeholder="contact@example.com"
									className="h-10 flex-1 rounded-lg border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
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
									onChange={e => setPhoneEdit(e.target.value)}
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
						{/* Theme */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Theme</label>
							<select
								value={themeMode}
								onChange={e => handleThemeChange(e.target.value)}
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							>
								<option value="system">System</option>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
							</select>
						</div>

						{/* Data Density */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Data Density</label>
							<select
								value={dataDensity}
								onChange={e => handleDensityChange(e.target.value)}
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
							<label className="text-sm font-medium">Timezone</label>
							<select
								value={timezone}
								onChange={e => setTimezone(e.target.value)}
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
							<label className="text-sm font-medium">Language</label>
							<select
								value={language}
								onChange={e => setLanguage(e.target.value)}
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
						disabled={updateProfile.isPending}
						className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						{updateProfile.isPending ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving...
							</span>
						) : (
							'Save Changes'
						)}
					</button>
				</div>
			</BlurFade>
		</div>
	)
}
