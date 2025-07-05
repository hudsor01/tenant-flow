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
import { Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface TenantDocumentUploadProps {
	tenantId: string
	leaseId?: string
	onUploadComplete?: (urls: string[]) => void
	maxFiles?: number
	className?: string
}

export default function TenantDocumentUpload({
	tenantId,
	leaseId,
	onUploadComplete,
	maxFiles = 3,
	className
}: TenantDocumentUploadProps) {
	const [uploadedUrls, setUploadedUrls] = React.useState<string[]>([])

	const additionalData = React.useMemo(() => {
		const data: Record<string, string> = {}
		if (leaseId) {
			data.leaseId = leaseId
		}
		return data
	}, [leaseId])

	const uploadProps = useFileUpload({
		endpoint: `/tenants/${tenantId}/upload-document`,
		allowedMimeTypes: [
			'image/*',
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		],
		maxFileSize: 5 * 1024 * 1024, // 5MB
		maxFiles,
		additionalData,
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
						<Shield className="h-5 w-5" />
						Upload Tenant Documents
					</CardTitle>
					<CardDescription>
						Upload lease agreements, ID verification, or other
						tenant-related documents. Maximum file size: 5MB per
						file.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Dropzone {...uploadProps} className="min-h-[180px]">
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
