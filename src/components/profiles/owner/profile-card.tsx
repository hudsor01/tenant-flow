'use client'

import type { ChangeEvent, RefObject } from 'react'
import { Camera, Clock, Loader2, LogOut } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { NumberTicker } from '#components/ui/number-ticker'
import { Stat, StatValue, StatDescription } from '#components/ui/stat'
import { Avatar, AvatarFallback, AvatarImage } from '#components/ui/avatar'

interface OwnerProfile {
	properties_count: number
	units_count: number
	stripe_connected: boolean
}

interface ProfileData {
	first_name?: string | null
	last_name?: string | null
	full_name: string
	avatar_url?: string | null
	user_type: string
	created_at: string
	owner_profile?: OwnerProfile | null
}

interface ProfileCardProps {
	profile: ProfileData
	fileInputRef: RefObject<HTMLInputElement | null>
	isPending: boolean
	isUploadingAvatar: boolean
	isRemovingAvatar: boolean
	isSigningOut: boolean
	onAvatarClick: () => void
	onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void
	onRemoveAvatar: () => void
	onSignOut: () => void
}

export function ProfileCard({
	profile,
	fileInputRef,
	isPending,
	isUploadingAvatar,
	isRemovingAvatar,
	isSigningOut,
	onAvatarClick,
	onAvatarChange,
	onRemoveAvatar,
	onSignOut
}: ProfileCardProps) {
	const getInitials = () => {
		if (profile.first_name && profile.last_name) {
			return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
		}
		if (profile.full_name) {
			return profile.full_name
				.split(' ')
				.map(n => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		}
		return 'U'
	}

	return (
		<BlurFade delay={0.15} inView>
			<div className="lg:col-span-1">
				<div className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>

					<div className="flex flex-col items-center">
						<div className="relative">
							<Avatar className="h-24 w-24">
								<AvatarImage
									src={profile.avatar_url || undefined}
									alt={profile.full_name}
								/>
								<AvatarFallback className="text-2xl bg-primary/10 text-primary">
									{getInitials()}
								</AvatarFallback>
							</Avatar>
							<button
								type="button"
								onClick={onAvatarClick}
								disabled={isPending}
								className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
								aria-label="Upload new avatar"
							>
								{isUploadingAvatar ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Camera className="h-4 w-4" />
								)}
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								className="hidden"
								onChange={onAvatarChange}
							/>
						</div>

						{profile.avatar_url && (
							<button
								type="button"
								onClick={onRemoveAvatar}
								disabled={isPending}
								className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
							>
								{isRemovingAvatar ? 'Removing...' : 'Remove photo'}
							</button>
						)}

						<h2 className="mt-4 text-xl font-semibold">{profile.full_name}</h2>
						<p className="text-sm text-muted-foreground capitalize">
							{profile.user_type === 'owner'
								? 'Property Owner'
								: profile.user_type}
						</p>

						<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							Member since{' '}
							{new Date(profile.created_at).toLocaleDateString('en-US', {
								month: 'short',
								year: 'numeric'
							})}
						</div>
					</div>

					{profile.owner_profile && (
						<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
							<BlurFade delay={0.2} inView>
								<Stat className="text-center">
									<StatValue className="flex items-center justify-center text-primary">
										<NumberTicker
											value={profile.owner_profile.properties_count}
											duration={1000}
										/>
									</StatValue>
									<StatDescription className="text-center">
										Properties
									</StatDescription>
								</Stat>
							</BlurFade>
							<BlurFade delay={0.25} inView>
								<Stat className="text-center">
									<StatValue className="flex items-center justify-center text-primary">
										<NumberTicker
											value={profile.owner_profile.units_count}
											duration={1200}
										/>
									</StatValue>
									<StatDescription className="text-center">
										Units
									</StatDescription>
								</Stat>
							</BlurFade>
						</div>
					)}

					<button
						type="button"
						onClick={onSignOut}
						disabled={isSigningOut}
						className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
					>
						{isSigningOut ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<LogOut className="h-4 w-4" />
						)}
						{isSigningOut ? 'Signing out...' : 'Sign Out'}
					</button>
				</div>
			</div>
		</BlurFade>
	)
}
