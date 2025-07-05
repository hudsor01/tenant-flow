import React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState
} from '@/components/dropzone'
import { useFileUpload } from '@/hooks/useFileUpload'
import type { FileUploadResponse } from '@/types/api'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { Camera, User } from 'lucide-react'
import { motion } from 'framer-motion'

interface ProfileImageUploadProps {
	onUploadComplete?: (url: string) => void
	className?: string
}

export default function ProfileImageUpload({
	onUploadComplete,
	className
}: ProfileImageUploadProps) {
	const uploadProps = useFileUpload({
		endpoint: '/users/upload-avatar',
		allowedMimeTypes: ['image/*'],
		maxFileSize: 2 * 1024 * 1024, // 2MB
		maxFiles: 1,
		onSuccess: (response: FileUploadResponse) => {
			if (onUploadComplete) {
				onUploadComplete(response.url)
			}
		}
	})

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={className}
		>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Profile Picture
					</CardTitle>
					<CardDescription>
						Upload a profile picture. Maximum file size: 2MB.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Current Avatar Display */}
					<div className="flex items-center justify-center">
						<div className="relative">
							<CurrentUserAvatar />
							<div className="bg-primary absolute -right-1 -bottom-1 rounded-full p-1">
								<Camera className="text-primary-foreground h-3 w-3" />
							</div>
						</div>
					</div>

					{/* Upload Dropzone */}
					<Dropzone {...uploadProps} className="min-h-[120px]">
						<DropzoneEmptyState />
						<DropzoneContent />
					</Dropzone>

					{uploadProps.errors.length > 0 && (
						<div className="mt-4 space-y-1">
							{uploadProps.errors.map((error, index) => (
								<p
									key={index}
									className="text-destructive text-sm"
								>
									{error.name}: {error.message}
								</p>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	)
}
