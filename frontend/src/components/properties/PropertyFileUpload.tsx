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
import { FileText } from 'lucide-react'
import { motion } from 'framer-motion'

interface PropertyFileUploadProps {
	propertyId: string
	onUploadComplete?: (urls: string[]) => void
	maxFiles?: number
	className?: string
}

export default function PropertyFileUpload({
	propertyId,
	onUploadComplete,
	maxFiles = 5,
	className
}: PropertyFileUploadProps) {
	const [uploadedUrls, setUploadedUrls] = React.useState<string[]>([])

	const uploadProps = useFileUpload({
		endpoint: `/properties/${propertyId}/upload-document`,
		allowedMimeTypes: [
			'image/*',
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/plain'
		],
		maxFileSize: 10 * 1024 * 1024, // 10MB
		maxFiles,
		onSuccess: (response: FileUploadResponse) => {
			setUploadedUrls(prev => [...prev, response.url])
		}
	})

	React.useEffect(() => {
		if (
			uploadProps.isSuccess &&
			onUploadComplete &&
			uploadedUrls.length > 0
		) {
			onUploadComplete(uploadedUrls)
		}
	}, [uploadProps.isSuccess, onUploadComplete, uploadedUrls])

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
						<FileText className="h-5 w-5" />
						Upload Property Documents
					</CardTitle>
					<CardDescription>
						Upload images, PDFs, or other documents related to this
						property. Maximum file size: 10MB per file.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Dropzone {...uploadProps} className="min-h-[200px]">
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
