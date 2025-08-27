'use client'

import { useEffect } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useFormState, useApiCall } from '@/hooks/common'
import { FormValidator } from '@/lib/validation/form-validator'
import type { ProfileFormData } from '@/types/forms'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { UpdateUserProfileSchema } from '@/lib/api/schemas/profile'
import { useAuth } from '@/hooks/use-auth'

export function ProfileSettings() {
	const { user } = useAuth()

	const {
		values: profile,
		handleChange,
		setValues
	} = useFormState<ProfileFormData>({
		initialValues: {
			name: '',
			email: '',
			phone: '',
			company: '',
			address: ''
		}
	})

	const { execute: saveProfile, isLoading } = useApiCall(
		async (data: ProfileFormData) => {
			// Validate and send, then validate the response shape
			return await apiClient.putValidated(
				'/api/v1/auth/profile',
				UpdateUserProfileSchema,
				'UpdateUserProfile',
				data as Record<string, unknown>
			)
		},
		{
			successMessage: 'Profile updated successfully',
			errorMessage: 'Failed to update profile'
		}
	)

	// Load user data on mount
	useEffect(() => {
		if (user) {
			const asRecord = (u: unknown): Record<string, unknown> =>
				typeof u === 'object' && u !== null
					? (u as Record<string, unknown>)
					: {}
			const record = asRecord(user)
			const getStringFrom = (k: string) => {
				const v = record[k]
				return typeof v === 'string' ? v : ''
			}
			setValues({
				name: getStringFrom('name'),
				email: getStringFrom('email'),
				phone: getStringFrom('phone'),
				company: getStringFrom('company'),
				address: getStringFrom('address')
			})
		}
	}, [user, setValues])

	const handleSave = async () => {
		// Basic UI validation
		const emailError = FormValidator.validateEmail(profile.email)
		if (emailError) {
			toast.error(emailError)
			return
		}

		await saveProfile(profile)
	}

	// Parse name for initials
	const nameParts = profile.name?.split(' ') || []
	const initials = nameParts
		.map(part => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<i className="i-lucide-user inline-block h-5 w-5"  />
						Profile Information
					</CardTitle>
					<CardDescription>
						Update your profile information and manage your account
						details.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Avatar Section */}
					<div className="flex items-center gap-4">
						<Avatar className="h-20 w-20">
							<AvatarImage
								src={profile.avatar}
								alt={profile.name}
							/>
							<AvatarFallback className="bg-primary/10 text-primary text-lg">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="space-y-2">
							<Button variant="outline" size="sm">
								<i className="i-lucide-camera inline-block mr-2 h-4 w-4"  />
								Change Photo
							</Button>
							<p className="text-muted-foreground text-sm">
								JPG, GIF or PNG. Max size 2MB.
							</p>
						</div>
					</div>

					<Separator />

					{/* Personal Information */}
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							value={profile.name}
							onChange={handleChange('name')}
							placeholder="Enter your full name"
						/>
					</div>

					{/* Contact Information */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="flex items-center gap-2"
							>
								<i className="i-lucide-mail inline-block h-4 w-4"  />
								Email Address
							</Label>
							<Input
								id="email"
								type="email"
								value={profile.email}
								onChange={handleChange('email')}
								placeholder="Enter your email"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="phone"
								className="flex items-center gap-2"
							>
								<i className="i-lucide-phone inline-block h-4 w-4"  />
								Phone Number
							</Label>
							<Input
								id="phone"
								value={profile.phone}
								onChange={handleChange('phone')}
								placeholder="Enter your phone number"
							/>
						</div>
					</div>

					{/* Business Information */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Label
								htmlFor="company"
								className="flex items-center gap-2"
							>
								<i className="i-lucide-building inline-block h-4 w-4"  />
								Company Name
							</Label>
							<Input
								id="company"
								value={profile.company}
								onChange={handleChange('company')}
								placeholder="Enter your company name"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="address"
								className="flex items-center gap-2"
							>
								<i className="i-lucide-map-pin inline-block h-4 w-4"  />
								Business Address
							</Label>
							<Input
								id="address"
								value={profile.address}
								onChange={handleChange('address')}
								placeholder="Enter your business address"
							/>
						</div>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium">
								Account Status
							</p>
							<div className="flex items-center gap-2">
								<Badge className="bg-green-500">Active</Badge>
								<span className="text-muted-foreground text-sm">
									Premium Plan
								</span>
							</div>
						</div>
						<Button onClick={handleSave} disabled={isLoading}>
							{isLoading ? (
								<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
							) : (
								<i className="i-lucide-save inline-block mr-2 h-4 w-4"  />
							)}
							Save Changes
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
