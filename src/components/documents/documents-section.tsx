'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
	documentMutations,
	documentQueries,
	type DocumentEntityType,
	type DocumentRow
} from '#hooks/api/query-keys/document-keys'
import {
	FileText,
	Image as ImageIcon,
	Loader2,
	Plus,
	Trash2,
	Download
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface DocumentsSectionProps {
	entityType: DocumentEntityType
	entityId: string
}

const ACCEPTED_MIME_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp'
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB — matches bucket limit

function formatBytes(bytes: number | null): string {
	if (bytes === null || bytes === 0) return '—'
	const kb = bytes / 1024
	if (kb < 1024) return `${kb.toFixed(0)} KB`
	return `${(kb / 1024).toFixed(1)} MB`
}

function isImage(mime: string | null | undefined): boolean {
	return !!mime && mime.startsWith('image/')
}

export function DocumentsSection({ entityType, entityId }: DocumentsSectionProps) {
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [openId, setOpenId] = useState<string | null>(null)

	const { data: documents, isLoading } = useQuery(
		documentQueries.list({ entityType, entityId })
	)

	const uploadMutation = useMutation({
		...documentMutations.upload(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: documentQueries.list({ entityType, entityId }).queryKey
			})
		}
	})

	const deleteMutation = useMutation({
		...documentMutations.delete(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: documentQueries.list({ entityType, entityId }).queryKey
			})
		}
	})

	const handleFilesSelected = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return

		// Partition selection so one bad file doesn't block the rest of the
		// batch — same pattern as PR #613 maintenance multi-file upload.
		const files = Array.from(fileList)
		const valid: File[] = []
		const rejected: string[] = []
		for (const file of files) {
			if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
				rejected.push(`${file.name} — unsupported type (PDF, JPG, PNG, WebP only)`)
			} else if (file.size > MAX_FILE_SIZE_BYTES) {
				rejected.push(`${file.name} — exceeds 10 MB`)
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
				await uploadMutation.mutateAsync({ entityType, entityId, file })
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

		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleDelete = async (doc: DocumentRow) => {
		try {
			await deleteMutation.mutateAsync({
				id: doc.id,
				storagePath: doc.file_path
			})
			toast.success('Document removed')
			setOpenId(null)
		} catch (err) {
			toast.error('Failed to remove document', {
				description: err instanceof Error ? err.message : 'Please try again.'
			})
		}
	}

	const docCount = documents?.length ?? 0
	const isUploading = uploadMutation.isPending

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
				<div>
					<CardTitle>Documents{docCount > 0 ? ` (${docCount})` : ''}</CardTitle>
					<CardDescription>
						Attach PDFs or images you want to keep alongside this property.
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
							Upload
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
					aria-label="Upload property documents"
				/>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : docCount === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<FileText className="size-8 mx-auto mb-2 opacity-50" />
						<p className="mb-3">No documents attached</p>
						<Button
							size="sm"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
						>
							<Plus className="size-4 mr-2" />
							Upload your first document
						</Button>
					</div>
				) : (
					<ul className="divide-y divide-border">
						{documents?.map(doc => {
							const Icon = isImage(doc.document_type) ? ImageIcon : FileText
							const displayName = doc.title ?? doc.file_path
							return (
								<li key={doc.id} className="py-3">
									<Dialog
										open={openId === doc.id}
										onOpenChange={open => setOpenId(open ? doc.id : null)}
									>
										<div className="flex items-center justify-between gap-3">
											<DialogTrigger asChild>
												<button
													type="button"
													className="flex-1 min-w-0 flex items-center gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-accent text-left"
													disabled={!doc.signed_url}
													aria-label={`Preview ${displayName}`}
												>
													<Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium text-foreground">
															{displayName}
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{formatBytes(doc.file_size)} ·{' '}
															{new Date(doc.created_at).toLocaleDateString('en-US', {
																month: 'short',
																day: 'numeric',
																year: 'numeric'
															})}
														</p>
													</div>
												</button>
											</DialogTrigger>
											{doc.signed_url ? (
												<Button
													size="sm"
													variant="ghost"
													asChild
													className="shrink-0"
												>
													<a
														href={doc.signed_url}
														download={displayName}
														aria-label={`Download ${displayName}`}
													>
														<Download className="size-4" />
													</a>
												</Button>
											) : null}
										</div>
										<DialogContent className="max-w-4xl p-2">
											<DialogTitle className="sr-only">{displayName}</DialogTitle>
											{doc.signed_url ? (
												isImage(doc.document_type) ? (
													<img
														src={doc.signed_url}
														alt={displayName}
														className="w-full rounded-md"
													/>
												) : (
													<iframe
														src={doc.signed_url}
														title={displayName}
														className="w-full h-[70vh] rounded-md"
													/>
												)
											) : (
												<p className="text-sm text-muted-foreground p-4">
													Preview unavailable.
												</p>
											)}
											<div className="flex items-center justify-between p-2">
												<span className="text-sm text-muted-foreground truncate">
													{displayName}
												</span>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleDelete(doc)}
													disabled={deleteMutation.isPending}
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
												>
													<Trash2 className="size-4 mr-2" />
													{deleteMutation.isPending ? 'Removing...' : 'Remove'}
												</Button>
											</div>
										</DialogContent>
									</Dialog>
								</li>
							)
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}
