import { Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { User } from '@tenantflow/shared'

interface AvatarState {
	file: File | null
	preview: string | null
	uploading: boolean
}

interface AvatarUploadSectionProps {
	user: User
	avatarState: AvatarState
	onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	getInitials: (name: string) => string
}

/**
 * Avatar upload section component for profile editing
 * Handles avatar display, upload, and preview functionality
 */
export function AvatarUploadSection({
	user,
	avatarState,
	onAvatarChange,
	getInitials
}: AvatarUploadSectionProps) {
	const displayAvatar = avatarState.preview || user?.avatarUrl

	return (
		<div className="flex flex-col items-center space-y-4">
			{/* Avatar Display */}
			<div className="relative">
				<Avatar className="h-24 w-24">
					<AvatarImage
						src={displayAvatar || undefined}
						alt={user?.name || 'User avatar'}
					/>
					<AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
						{user?.name ? getInitials(user.name) : 'U'}
					</AvatarFallback>
				</Avatar>

				{/* Upload Overlay */}
				<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
					<Camera className="h-6 w-6 text-white" />
				</div>

				{/* Loading Overlay */}
				{avatarState.uploading && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
						<Loader2 className="h-6 w-6 animate-spin text-white" />
					</div>
				)}
			</div>

			{/* Upload Button */}
			<div className="text-center">
				<Label htmlFor="avatar" className="cursor-pointer">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="relative"
						disabled={avatarState.uploading}
						asChild
					>
						<span>
							<Camera className="mr-2 h-4 w-4" />
							{avatarState.file ? 'Change Photo' : 'Upload Photo'}
						</span>
					</Button>
				</Label>
				<input
					id="avatar"
					type="file"
					accept="image/*"
					onChange={onAvatarChange}
					className="hidden"
					disabled={avatarState.uploading}
				/>
			</div>

			{/* Upload Info */}
			<div className="space-y-1 text-center">
				<p className="text-muted-foreground text-xs">
					JPG, PNG or GIF. Max file size 2MB.
				</p>
				{avatarState.file && (
					<p className="text-xs font-medium text-green-600">
						✓ Ready to upload: {avatarState.file.name}
					</p>
				)}
			</div>

			{/* Upload Status */}
			{avatarState.uploading && (
				<div className="text-center">
					<p className="text-primary text-sm font-medium">
						Uploading avatar...
					</p>
				</div>
			)}
		</div>
	)
}
