'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import {
	maintenanceQueries,
	maintenanceMutations
} from '#hooks/api/query-keys/maintenance-keys'
import { Camera, Plus, Trash2, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface PhotosCardProps {
	requestId: string
}

const ACCEPTED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'video/mp4',
	'video/quicktime'
]
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB per file

export function PhotosCard({ requestId }: PhotosCardProps) {
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

	const { data: photos, isLoading } = useQuery(
		maintenanceQueries.photos(requestId)
	)

	const uploadMutation = useMutation({
		...maintenanceMutations.uploadPhoto(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.photos(requestId).queryKey
			})
		}
	})

	const deleteMutation = useMutation({
		...maintenanceMutations.deletePhoto(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.photos(requestId).queryKey
			})
		}
	})

	const handleFilesSelected = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return

		const files = Array.from(fileList)
		const valid: File[] = []
		const rejected: string[] = []

		// Partition files into valid/rejected so one bad file doesn't block the
		// rest of a multi-file selection from uploading.
		for (const file of files) {
			if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
				rejected.push(`${file.name} — unsupported type`)
			} else if (file.size > MAX_FILE_SIZE_BYTES) {
				rejected.push(`${file.name} — exceeds 25 MB`)
			} else {
				valid.push(file)
			}
		}

		if (rejected.length > 0) {
			toast.error(`Skipped ${rejected.length} file${rejected.length === 1 ? '' : 's'}`, {
				description: rejected.join('\n')
			})
		}

		let uploaded = 0
		const failures: string[] = []
		for (const file of valid) {
			try {
				await uploadMutation.mutateAsync({ requestId, file })
				uploaded++
			} catch (err) {
				failures.push(
					`${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`
				)
			}
		}

		if (uploaded > 0) {
			toast.success(`Uploaded ${uploaded} file${uploaded === 1 ? '' : 's'}`)
		}
		if (failures.length > 0) {
			toast.error(`Failed to upload ${failures.length} file(s)`, {
				description: failures.join('\n')
			})
		}

		// Reset the input so re-selecting the same file re-triggers change.
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleDelete = async (photoId: string, storagePath: string) => {
		try {
			await deleteMutation.mutateAsync({ photoId, storagePath })
			toast.success('Photo removed')
			setSelectedIndex(null)
		} catch (err) {
			toast.error('Failed to remove photo', {
				description: err instanceof Error ? err.message : 'Please try again.'
			})
		}
	}

	const photoCount = photos?.length ?? 0
	const isUploading = uploadMutation.isPending

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
				<div>
					<CardTitle className="text-base">
						Photos &amp; videos{photoCount > 0 ? ` (${photoCount})` : ''}
					</CardTitle>
					<CardDescription>
						Attach before/after photos, videos of the issue, or receipts.
					</CardDescription>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploading}
				>
					{isUploading ? (
						<>
							<Loader2 className="size-4 mr-2 animate-spin" />
							Uploading...
						</>
					) : (
						<>
							<Plus className="size-4 mr-2" />
							Add
						</>
					)}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept={ACCEPTED_MIME_TYPES.join(',')}
					onChange={e => handleFilesSelected(e.target.files)}
					className="sr-only"
					aria-label="Upload maintenance photos or videos"
				/>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="aspect-square rounded-md" />
						))}
					</div>
				) : photoCount === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Camera className="size-8 mx-auto mb-2 opacity-50" />
						<p className="mb-3">No photos attached</p>
						<Button
							size="sm"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
						>
							<Plus className="size-4 mr-2" />
							Add photos or videos
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{photos?.map((photo, index) => {
							const isVideo = photo.mime_type.startsWith('video/')
							const url = photo.signed_url
							if (!url) {
								// Signed URL generation failed (e.g. RLS gap or network).
								// Render a placeholder tile so owners still see the file
								// exists and can remove it via the preview dialog.
								return (
									<div
										key={photo.id}
										className="rounded-md bg-muted aspect-square w-full flex items-center justify-center text-xs text-muted-foreground text-center px-2"
										title={photo.file_name}
									>
										{photo.file_name}
									</div>
								)
							}
							return (
								<Dialog
									key={photo.id}
									open={selectedIndex === index}
									onOpenChange={open => setSelectedIndex(open ? index : null)}
								>
									<DialogTrigger asChild>
										<button
											type="button"
											className="overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative group"
											aria-label={`View ${photo.file_name}`}
										>
											{isVideo ? (
												<video
													src={url}
													className="rounded-md object-cover aspect-square w-full"
													preload="metadata"
												/>
											) : (
												<img
													src={url}
													alt={photo.file_name}
													className="rounded-md object-cover aspect-square w-full hover:opacity-90 transition-opacity"
												/>
											)}
										</button>
									</DialogTrigger>
									<DialogContent className="max-w-3xl p-2">
										<DialogTitle className="sr-only">
											{photo.file_name}
										</DialogTitle>
										{isVideo ? (
											<video
												src={url}
												className="w-full rounded-md"
												controls
												autoPlay
											/>
										) : (
											<img
												src={url}
												alt={photo.file_name}
												className="w-full rounded-md"
											/>
										)}
										<div className="flex items-center justify-between p-2">
											<span className="text-sm text-muted-foreground truncate">
												{photo.file_name}
											</span>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleDelete(photo.id, photo.storage_path)
												}
												disabled={deleteMutation.isPending}
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
											>
												<Trash2 className="size-4 mr-2" />
												{deleteMutation.isPending ? 'Removing...' : 'Remove'}
											</Button>
										</div>
									</DialogContent>
								</Dialog>
							)
						})}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
