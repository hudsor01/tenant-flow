'use client'

import {
	CheckCircle,
	Edit,
	Loader2,
	Mail,
	Phone,
	User
} from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { BlurFade } from '#components/ui/blur-fade'

interface ProfileData {
	email: string
	phone?: string | null
	full_name: string
	status: string
}

interface FormData {
	first_name: string
	last_name: string
	phone: string
}

interface PersonalInfoSectionProps {
	profile: ProfileData
	isEditing: boolean
	isPending: boolean
	formData: FormData
	onEditClick: () => void
	onCancelEdit: () => void
	onSaveProfile: () => void
	onFormChange: (data: Partial<FormData>) => void
}

export function PersonalInfoSection({
	profile,
	isEditing,
	isPending,
	formData,
	onEditClick,
	onCancelEdit,
	onSaveProfile,
	onFormChange
}: PersonalInfoSectionProps) {
	return (
		<BlurFade delay={0.3} inView>
			<section className="rounded-lg border bg-card p-6">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold">Personal Information</h3>
					{!isEditing && (
						<button
							type="button"
							onClick={onEditClick}
							className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
						>
							<Edit className="h-4 w-4" />
							Edit
						</button>
					)}
				</div>

				{isEditing ? (
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="first_name">First Name</Label>
								<Input
									id="first_name"
									value={formData.first_name}
									onChange={e =>
										onFormChange({ first_name: e.target.value })
									}
									disabled={isPending}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="last_name">Last Name</Label>
								<Input
									id="last_name"
									value={formData.last_name}
									onChange={e =>
										onFormChange({ last_name: e.target.value })
									}
									disabled={isPending}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email Address</Label>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									value={profile.email}
									disabled
									className="bg-muted"
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Email cannot be changed. Contact support if needed.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phone">Phone Number</Label>
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-muted-foreground" />
								<Input
									id="phone"
									type="tel"
									placeholder="(555) 123-4567"
									value={formData.phone}
									onChange={e =>
										onFormChange({ phone: e.target.value })
									}
									disabled={isPending}
								/>
							</div>
						</div>

						<div className="flex gap-3 pt-4">
							<Button onClick={onSaveProfile} disabled={isPending}>
								{isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Saving...
									</>
								) : (
									'Save Changes'
								)}
							</Button>
							<Button
								variant="outline"
								onClick={onCancelEdit}
								disabled={isPending}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						<BlurFade delay={0.35} inView>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									Full Name
								</label>
								<div className="flex items-center gap-2">
									<User className="h-4 w-4 text-muted-foreground" />
									<p className="text-sm font-medium">{profile.full_name}</p>
								</div>
							</div>
						</BlurFade>

						<BlurFade delay={0.4} inView>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									Email Address
								</label>
								<div className="flex items-center gap-2">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<p className="text-sm font-medium">{profile.email}</p>
								</div>
							</div>
						</BlurFade>

						<BlurFade delay={0.45} inView>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									Phone Number
								</label>
								<div className="flex items-center gap-2">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<p className="text-sm font-medium">
										{profile.phone || 'Not set'}
									</p>
								</div>
							</div>
						</BlurFade>

						<BlurFade delay={0.5} inView>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									Account Status
								</label>
								<div className="flex items-center gap-2">
									<CheckCircle className="h-4 w-4 text-emerald-500" />
									<p className="text-sm font-medium capitalize">
										{profile.status}
									</p>
								</div>
							</div>
						</BlurFade>
					</div>
				)}
			</section>
		</BlurFade>
	)
}
