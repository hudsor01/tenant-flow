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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	documentMutations,
	documentQueries,
	LIST_DISPLAY_LIMIT,
	type DocumentEntityType,
	type DocumentRow as DocumentRowData
} from '#hooks/api/query-keys/document-keys'
import {
	DEFAULT_CATEGORY_LABELS,
	DEFAULT_CATEGORY_SLUGS,
	type DocumentCategory
} from '#lib/validation/documents'
import { useDocumentCategories } from '#hooks/api/use-document-categories'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'
import { AlertTriangle, FileText, Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DocumentRow } from './document-row'
import {
	ACCEPTED_MIME_TYPES,
	reportUploadSummary,
	validateFiles
} from './documents-section-helpers'

interface DocumentsSectionProps {
	entityType: DocumentEntityType
	entityId: string
}

// Human-readable labels for each entity type. Drives the
// CardDescription copy + upload button aria-labels so they stay
// accurate on lease/tenant/maintenance detail pages (not just property).
const ENTITY_LABELS: Record<DocumentEntityType, string> = {
	property: 'property',
	lease: 'lease',
	tenant: 'tenant',
	maintenance_request: 'maintenance request',
	inspection: 'inspection'
}

export function DocumentsSection({ entityType, entityId }: DocumentsSectionProps) {
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [openId, setOpenId] = useState<string | null>(null)
	const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set())
	// One category per upload batch. Multi-file uploads share the choice;
	// per-file categorization would force a dialog roundtrip we want to
	// avoid. Defaults to 'other' — every owner is seeded with `other` at
	// signup (Phase 65 migration) so this is always a valid slug at
	// first render. The effect below re-syncs if the user has somehow
	// removed `other` from their taxonomy by the time the categories
	// query lands (Phase 66+ once delete is exposed).
	const [category, setCategory] = useState<DocumentCategory>('other')
	// Phase 65: Select options come from the per-owner taxonomy. On
	// query error, fall back to the seven seeded defaults so the upload
	// flow keeps working — those slugs are the migration-guaranteed
	// floor of every owner's category set.
	const {
		categories: ownedCategories,
		isLoading: categoriesLoading
	} = useDocumentCategories()
	const selectOptions = useMemo(() => {
		// Fall back to the seven seeded defaults whenever the owned set
		// is empty AND we're not still loading. Covers BOTH the explicit
		// error case (network failure, 5xx) AND the empty-success edge
		// case (transient zero-row response, or — once Phase 66 ships —
		// a user mid-deletion who removed every category). The fallback
		// keeps the upload Select usable; the trigger will reject any
		// slug that isn't in the user's actual taxonomy at write time.
		if (!categoriesLoading && ownedCategories.length === 0) {
			return DEFAULT_CATEGORY_SLUGS.map(slug => ({
				slug,
				label: DEFAULT_CATEGORY_LABELS[slug],
				key: slug
			}))
		}
		return ownedCategories.map(c => ({
			slug: c.slug,
			label: c.label,
			key: c.id
		}))
	}, [ownedCategories, categoriesLoading])
	// Re-sync `category` if the loaded set doesn't include the current
	// state value. Prevents the form from submitting an orphaned slug
	// (which would 23514 at the trigger boundary).
	useEffect(() => {
		if (selectOptions.length === 0) return
		if (selectOptions.some(o => o.slug === category)) return
		const fallback = selectOptions[0]?.slug
		if (fallback) setCategory(fallback)
	}, [selectOptions, category])

	const {
		data: listResult,
		isLoading,
		isError,
		refetch
	} = useQuery(documentQueries.list({ entityType, entityId }))
	const documents = listResult?.rows
	const totalCount = listResult?.totalCount ?? 0

	const invalidateListAndDashboard = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: documentQueries.list({ entityType, entityId }).queryKey
		})
		queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
	}, [queryClient, entityType, entityId])

	// No onSuccess here — a multi-file upload loop would otherwise fire one
	// full list + dashboard refetch PER file. Invalidation happens once after
	// the whole batch in handleFilesSelected.
	const uploadMutation = useMutation(documentMutations.upload())
	// Delete is single-document so keep onSuccess here.
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
					// Browser-reported MIME. The documents row stores it in
					// `mime_type`; `document_type` is a categorical column
					// (defaults to 'other' for owner-uploaded files).
					mimeType: file.type,
					category
				})
				uploaded++
			} catch (err) {
				failures.push(
					`${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`
				)
			}
		}

		// Single invalidation after the whole batch (not once per file).
		if (uploaded > 0) invalidateListAndDashboard()

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
		} catch (err) {
			toast.error('Failed to remove document', {
				description: err instanceof Error ? err.message : 'Please try again.'
			})
		} finally {
			// Always close the preview dialog and clear the in-flight flag,
			// even on error. Leaving the dialog open on a failed delete shows
			// a stale/broken preview the user can't escape.
			setOpenId(null)
			setDeletingIds(prev => {
				const next = new Set(prev)
				next.delete(doc.id)
				return next
			})
		}
	}

	const docCount = documents?.length ?? 0
	const isUploading = uploadMutation.isPending
	const isTruncated = totalCount > (documents?.length ?? 0)
	const entityLabel = ENTITY_LABELS[entityType]

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
				<div>
					<CardTitle>
						Documents
						{totalCount > 0
							? isTruncated
								? ` (showing ${docCount} of ${totalCount})`
								: ` (${totalCount})`
							: ''}
					</CardTitle>
					<CardDescription>
						Attach PDFs or images you want to keep alongside this {entityLabel}.
					</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={category}
						onValueChange={value => setCategory(value as DocumentCategory)}
						disabled={isUploading || categoriesLoading}
					>
						<SelectTrigger
							size="sm"
							className="w-[180px]"
							aria-label="Category for next upload"
						>
							<SelectValue placeholder={categoriesLoading ? 'Loading…' : undefined} />
						</SelectTrigger>
						<SelectContent>
							{selectOptions.map(o => (
								<SelectItem key={o.key} value={o.slug}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
						aria-label={`Upload ${entityLabel} documents`}
					/>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : isError ? (
					<div className="text-center py-8">
						<AlertTriangle className="size-8 mx-auto mb-2 text-destructive" />
						<p className="mb-3 text-sm text-muted-foreground">
							We couldn't load your documents.
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={() => { void refetch() }}
						>
							Try again
						</Button>
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
					<>
						{isTruncated && (
							<p className="text-xs text-muted-foreground mb-3">
								Showing the {LIST_DISPLAY_LIMIT} most-recent documents.{' '}
								{totalCount - (documents?.length ?? 0)} older documents are
								not displayed. Pagination arrives in a later release.
							</p>
						)}
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
					</>
				)}
			</CardContent>
		</Card>
	)
}
