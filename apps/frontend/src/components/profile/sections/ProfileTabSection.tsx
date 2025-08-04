import { UserIcon, Phone, FileText, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { UseFormReturn } from 'react-hook-form'
import { AvatarUploadSection } from './AvatarUploadSection'
import { createAsyncHandler } from '@/utils/async-handlers'
import type { User } from '@repo/shared'
import type { ProfileFormData } from '@/hooks/useEditProfileData'

interface AvatarState {
	file: File | null
	preview: string | null
	uploading: boolean
}

interface ProfileTabSectionProps {
	user: User
	form: UseFormReturn<ProfileFormData>
	avatarState: AvatarState
	onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	onSubmit: (data: ProfileFormData) => Promise<void>
	onCancel: () => void
	getInitials: (name: string) => string
}

/**
 * Profile tab section component for profile editing
 * Handles avatar upload and basic profile information
 */
export function ProfileTabSection({
	user,
	form,
	avatarState,
	onAvatarChange,
	onSubmit,
	onCancel,
	getInitials
}: ProfileTabSectionProps) {
	return (
		<form onSubmit={createAsyncHandler(form.handleSubmit(onSubmit), 'Failed to update profile')} className="space-y-6">
			{/* Avatar Upload Section */}
			<AvatarUploadSection
				user={user}
				avatarState={avatarState}
				onAvatarChange={onAvatarChange}
				getInitials={getInitials}
			/>

			{/* Basic Information Fields */}
			<div className="space-y-4">
				{/* Full Name */}
				<div className="space-y-2">
					<Label
						htmlFor="name"
						className="text-sm font-medium text-gray-700"
					>
						Full Name *
					</Label>
					<div className="relative">
						<UserIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<Input
							id="name"
							placeholder="Enter your full name"
							className="pl-10 transition-colors focus:border-blue-500"
							{...form.register('name')}
						/>
					</div>
					{form.formState.errors.name && (
						<p className="text-sm text-red-600">
							{form.formState.errors.name.message}
						</p>
					)}
				</div>

				{/* Phone Number */}
				<div className="space-y-2">
					<Label
						htmlFor="phone"
						className="text-sm font-medium text-gray-700"
					>
						Phone Number
					</Label>
					<div className="relative">
						<Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<Input
							id="phone"
							type="tel"
							placeholder="e.g., (555) 123-4567"
							className="pl-10 transition-colors focus:border-blue-500"
							{...form.register('phone')}
						/>
					</div>
					{form.formState.errors.phone && (
						<p className="text-sm text-red-600">
							{form.formState.errors.phone.message}
						</p>
					)}
					<p className="text-xs text-gray-500">
						Optional: Used for important account notifications
					</p>
				</div>

				{/* Bio */}
				<div className="space-y-2">
					<Label
						htmlFor="bio"
						className="text-sm font-medium text-gray-700"
					>
						Bio
					</Label>
					<div className="relative">
						<FileText className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
						<Textarea
							id="bio"
							placeholder="Tell us a bit about yourself..."
							className="min-h-[80px] pl-10 transition-colors focus:border-blue-500"
							{...form.register('bio')}
						/>
					</div>
					{form.formState.errors.bio && (
						<p className="text-sm text-red-600">
							{form.formState.errors.bio.message}
						</p>
					)}
					<p className="text-xs text-gray-500">
						Optional: Max 500 characters. This appears on your
						tenant portal.
					</p>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end space-x-3 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={
						form.formState.isSubmitting || avatarState.uploading
					}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={
						form.formState.isSubmitting || avatarState.uploading
					}
					className="bg-blue-600 hover:bg-blue-700"
				>
					{form.formState.isSubmitting ? (
						<>
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							Updating...
						</>
					) : (
						<>
							<Save className="mr-2 h-4 w-4" />
							Save Changes
						</>
					)}
				</Button>
			</div>
		</form>
	)
}
