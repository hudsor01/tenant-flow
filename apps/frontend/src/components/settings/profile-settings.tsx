'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useApiCall } from '@/hooks/common'
import { profileFormSchema, type ProfileFormData } from '@/lib/validation/schemas'


import { useAuth } from '@/hooks/use-auth'
import { User , Building , Save , MapPin , Loader2 , Mail , Phone , Camera } from 'lucide-react'
export function ProfileSettings() {
	const { user } = useAuth()

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
		reset
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileFormSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			company: '',
			address: '',
			avatar: ''
		}
	})

	const profile = watch() // Watch all form values for reactive updates

	const { execute: saveProfile, isLoading } = useApiCall(
		async (data: ProfileFormData) => {
			// TODO: Replace with proper API client
			const response = await fetch('/api/v1/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			
			if (!response.ok) {
				throw new Error('Failed to update profile')
			}
			
			return await response.json()
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
			reset({
				name: getStringFrom('name'),
				email: getStringFrom('email'),
				phone: getStringFrom('phone'),
				company: getStringFrom('company'),
				address: getStringFrom('address'),
				avatar: getStringFrom('avatar')
			})
		}
	}, [user, reset])

	const onSubmit = async (data: ProfileFormData) => {
		// Validation is automatically handled by zodResolver
		await saveProfile(data)
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
						<User className=" h-5 w-5"  />
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
								<Camera className=" mr-2 h-4 w-4"  />
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
							{...register('name')}
							placeholder="Enter your full name"
						/>
						{errors.name && (
							<p className="text-destructive text-sm mt-1">{errors.name.message}</p>
						)}
					</div>

					{/* Contact Information */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="flex items-center gap-2"
							>
								<Mail className=" h-4 w-4"  />
								Email Address
							</Label>
							<Input
								id="email"
								type="email"
								{...register('email')}
								placeholder="Enter your email"
							/>
							{errors.email && (
								<p className="text-destructive text-sm mt-1">{errors.email.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="phone"
								className="flex items-center gap-2"
							>
								<Phone className=" h-4 w-4"  />
								Phone Number
							</Label>
							<Input
								id="phone"
								{...register('phone')}
								placeholder="Enter your phone number"
							/>
							{errors.phone && (
								<p className="text-destructive text-sm mt-1">{errors.phone.message}</p>
							)}
						</div>
					</div>

					{/* Business Information */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Label
								htmlFor="company"
								className="flex items-center gap-2"
							>
								<Building className=" h-4 w-4"  />
								Company Name
							</Label>
							<Input
								id="company"
								{...register('company')}
								placeholder="Enter your company name"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="address"
								className="flex items-center gap-2"
							>
								<MapPin className=" h-4 w-4"  />
								Business Address
							</Label>
							<Input
								id="address"
								{...register('address')}
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
								<Badge className="bg-green-5">Active</Badge>
								<span className="text-muted-foreground text-sm">
									Premium Plan
								</span>
							</div>
						</div>
						<Button onClick={handleSubmit(onSubmit)} disabled={isLoading || isSubmitting}>
							{(isLoading || isSubmitting) ? (
								<Loader2 className=" mr-2 h-4 w-4 animate-spin"  />
							) : (
								<Save className=" mr-2 h-4 w-4"  />
							)}
							Save Changes
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
