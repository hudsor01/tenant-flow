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
import { Skeleton } from '#components/ui/skeleton'
import {
	documentMutations,
	documentQueries,
	type DocumentEntityType,
	type DocumentRow as DocumentRowData
} from '#hooks/api/query-keys/document-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'
import { FileText, Loader2, Plus } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DocumentRow } from './document-row'

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

interface UploadSummary {
	uploaded: number
	failures: string[]
	rejected: string[]
}

function validateFiles(files: File[]): { valid: File[]; rejected: string[] } {
	const valid: File[] = []
	const rejected: string[] = []
	for (const file of files) {
		if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
			rejected.push(`${file.name} — unsupported type (PDF, JPG, PNG, WebP only)`)
		} else if (file.size > MAX_FILE_SIZE_BYTES) {
			rejected.push(`${file.name} — exceeds 10 MB`)
		} else if (file.size === 0) {
			rejected.push(`${file.name} — empty file`)
		} else {
			valid.push(file)
		}
	}
	return { valid, rejected }
}

function reportUploadSummary(summary: UploadSummary) {
	const { uploaded, failures, rejected } = summary
	const errors = [...rejected, ...failures]
	// Consolidate into one toast so mobile users don't miss failure info by
	// dismissing the success toast.
	if (uploaded > 0 && errors.length === 0) {
		toast.success(`Uploaded ${uploaded} file${uploaded === 1 ? '' : 's'}`)
		return
	}
	if (uploaded > 0 && errors.length > 0) {
		toast.warning(
			`Uploaded ${uploaded} · skipped ${errors.length}`,
			{
				description: errors.join('\n'),
				duration: 10000
			}
		)
		return
	}
	if (uploaded === 0 && errors.length > 0) {
		toast.error(`Skipped ${errors.length} file${errors.length === 1 ? '' : 's'}`, {
			description: errors.join('\n'),
			duration: 10000
		})
	}
}

export function DocumentsSection({ entityType, entityId }: DocumentsSectionProps) {
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [openId, setOpenId] = useState<string | null>(null)
	// Tracks which specific documents are currently being deleted so the
	// "Remove" button only spins on the row whose mutation is in flight,
	// even when the user clicks delete on multiple rows rapidly.
	const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set())

	const { data: documents, isLoading } = useQuery(
		documentQueries.list({ entityType, entityId })
	)

	const invalidateListAndDashboard = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: documentQueries.list({ entityType, entityId }).queryKey
		})
		queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
	}, [queryClient, entityType, entityId])

	const uploadMutation = useMutation({
		...documentMutations.upload(),
		onSuccess: invalidateListAndDashboard
	})

	const deleteMutation = useMutation({
		...documentMutations.delete(),
		onSuccess: invalidateListAndDashboard
	})

	const handleFilesSelected = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return

		const { valid, rejected } = validateFiles(Array.from(fileList))

		let uploaded = 0
		const failures: string[] = []
		for (const file of valid) {
			try {
				await uploadMutation.mutateAsync({
					entityType,
					entityId,
					file,
					// Browser-reported MIME — the documents row stores it in
					// `mime_type`; `document_type` is a categorical column
					// (defaults to 'other' for owner-uploaded files).
					mimeType: file.type
				})
				uploaded++
			} catch (err) {
				failures.push(
					`${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`
				)
			}
		}

		reportUploadSummary({ uploaded, failures, rejected })

		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleDelete = async (doc: DocumentRowData) => {
		setDeletingIds(prev => {
			const next = new Set(prev)
			next.add(doc.id)
			return next
		})
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
		} finally {
			setDeletingIds(prev => {
				const next = new Set(prev)
				next.delete(doc.id)
				return next
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
					aria-haspopup="dialog"
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
							aria-haspopup="dialog"
						>
							<Plus className="size-4 mr-2" />
							Upload your first document
						</Button>
					</div>
				) : (
					<ul className="divide-y divide-border">
						{documents?.map(doc => (
							<DocumentRow
								key={doc.id}
								doc={doc}
								isOpen={openId === doc.id}
								onOpenChange={open => setOpenId(open ? doc.id : null)}
								onDelete={handleDelete}
								isDeleting={deletingIds.has(doc.id)}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}
